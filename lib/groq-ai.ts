import Groq from "groq-sdk";

export const DEFAULT_BUSINESS_NAME = "Goals Floors";
export const DEFAULT_CATEGORY = "Wood and laminate flooring supplier";
export const DEFAULT_LOCATION = "Gurgaon, Delhi NCR";
export const DEFAULT_KEYWORDS = [
  "wooden flooring",
  "laminate flooring",
  "herringbone flooring",
  "deck tiles",
  "vinyl flooring",
  "SPC flooring installation",
  "balcony flooring",
];

// Active high-performance models on Groq
// Note: qwen/qwen3.8-27b delivers ultra-fast 1.5s responses with strict JSON adherence
export const FAST_MODEL = "qwen/qwen3.8-27b";
export const CONTENT_MODEL = "qwen/qwen3.8-27b";
export const BACKUP_MODEL = "openai/gpt-oss-120b";

// ==========================================
// DYNAMIC BUSINESS PROFILE CONTEXT (CACHED)
// ==========================================

export type BusinessProfileContext = {
  name: string;
  category: string;
  location: string;
  keywords: string[];
};

let cachedBusinessContext: { data: BusinessProfileContext; expiresAt: number } | null = null;

/**
 * Resolves the real connected Google Business Profile details (name, category, location)
 * with a 30-minute in-memory cache to prevent repeated API calls.
 * If user updates or connects a different GMB, all prompts immediately use the new business!
 */
export async function getBusinessProfileContext(
  forceRefresh = false,
): Promise<BusinessProfileContext> {
  const now = Date.now();
  if (!forceRefresh && cachedBusinessContext && cachedBusinessContext.expiresAt > now) {
    return cachedBusinessContext.data;
  }

  let name = DEFAULT_BUSINESS_NAME;
  let category = DEFAULT_CATEGORY;
  const location = DEFAULT_LOCATION;
  let keywords = DEFAULT_KEYWORDS;

  try {
    const { getBusinessProfile } = await import("./gmb-client");
    const profile = await getBusinessProfile().catch(() => null);
    if (profile) {
      if (profile.title && profile.title.trim().length > 1) {
        name = profile.title.trim();
      }
      if (profile.primaryCategory && profile.primaryCategory.trim().length > 1) {
        category = profile.primaryCategory.trim();
      }
      if (Array.isArray(profile.additionalCategories) && profile.additionalCategories.length > 0) {
        keywords = [category, ...profile.additionalCategories.map((c) => c.toLowerCase())];
      }
    }
  } catch (err) {
    console.warn("Using default business profile context fallback:", err);
  }

  const data: BusinessProfileContext = { name, category, location, keywords };
  cachedBusinessContext = { data, expiresAt: now + 30 * 60 * 1000 };
  return data;
}

// ==========================================
// MULTI-KEY FAILOVER & LOAD BALANCING
// ==========================================

function getGroqKeys(): string[] {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY2,
    process.env.GROQ_API_KEY3,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k && k.length > 5));

  return keys;
}

let currentKeyIndex = 0;

/**
 * Executes a Groq operation with automatic multi-key round-robin
 * load balancing and instant failover on rate limits (429) or network errors.
 */
async function executeWithGroq<T>(
  operation: (groq: Groq, model: string) => Promise<T>,
  preferredModel: string = FAST_MODEL,
): Promise<T | null> {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;

  const startIndex = currentKeyIndex % keys.length;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  let lastError: unknown = null;

  // Try each key in sequence starting from round-robin index
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[(startIndex + attempt) % keys.length];
    const groq = new Groq({ apiKey: key });

    try {
      return await operation(groq, preferredModel);
    } catch (err: unknown) {
      lastError = err;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("rate_limit_exceeded") ||
          err.message.includes("tokens per minute"));

      console.warn(
        `[Groq Load Balancer] Key ${attempt + 1}/${keys.length} ${
          isRateLimit ? "rate limited (429)" : "failed"
        }. Switching to next key...`,
      );

      // On last attempt, try backup model once
      if (attempt === keys.length - 1) {
        const altModel = preferredModel === FAST_MODEL ? BACKUP_MODEL : FAST_MODEL;
        try {
          return await operation(groq, altModel);
        } catch {
          // ignore
        }
      }
    }
  }

  console.error("[Groq Load Balancer] All available Groq keys failed:", lastError);
  return null;
}

// ==========================================
// 1. POST CONTENT GENERATION
// ==========================================

export type GeneratedPostContent = {
  title: string;
  body: string;
  cta: "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";
  hashtags: string[];
};

export async function generatePostContent(
  topic?: string,
  type: "STANDARD" | "OFFER" | "EVENT" = "STANDARD",
  customBusiness?: Partial<BusinessProfileContext>,
): Promise<GeneratedPostContent> {
  const biz = { ...(await getBusinessProfileContext()), ...(customBusiness || {}) };

  const prompt = `You are an expert Local SEO copywriter for "${biz.name}", a premier ${biz.category} in ${biz.location}.
Write a high-converting, punchy Google Business Profile ${type} post.
Topic/Focus: ${topic?.trim() || `Featured products, premium services, and consultation from ${biz.name}`}.
Business details: ${biz.name}, ${biz.location}. Specializes in high-quality craftsmanship, customer satisfaction, and local expertise.

Format response as strict JSON with this exact schema:
{
  "title": "Compelling headline under 60 chars",
  "body": "Punchy body copy (80-140 words) with clear benefits, urgency, and a call-to-action inviting customers to visit or call",
  "cta": "CALL" | "BOOK" | "LEARN_MORE" | "ORDER",
  "hashtags": ["#${biz.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}", "#localbusiness", ...]
}
Return ONLY valid raw JSON without markdown code fences or conversational text.`;

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: "You output strictly valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as GeneratedPostContent;

    if (parsed.body && parsed.body.length > 20) {
      return {
        title: parsed.title || `Transform Your Spaces with ${biz.name}`,
        body: parsed.body,
        cta: parsed.cta || (type === "OFFER" ? "ORDER" : "CALL"),
        hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
          ? parsed.hashtags.slice(0, 6)
          : [`#${biz.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`, "#localbusiness"],
      };
    }
    return null;
  }, CONTENT_MODEL);

  return result || getFallbackPost(biz, topic, type);
}

function getFallbackPost(
  biz: BusinessProfileContext,
  topic?: string,
  type: "STANDARD" | "OFFER" | "EVENT" = "STANDARD",
): GeneratedPostContent {
  const cleanTag = `#${biz.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

  if (type === "OFFER") {
    return {
      title: `Special Limited Offer: Exclusive Savings at ${biz.name}`,
      body: `Upgrade your living spaces with premium solutions from ${biz.name} in ${biz.location}. For a limited time, enjoy special consultation discounts and fast delivery. Visit our showroom or call today to claim this limited-time offer.`,
      cta: "CALL",
      hashtags: [cleanTag, "#specialoffer", "#limitedtimediscount"],
    };
  }

  if (type === "EVENT") {
    return {
      title: `${biz.name} Showcase & Design Consultation Week`,
      body: `Join us this week at ${biz.name} in ${biz.location} for our exclusive design and consultation showcase! Explore our latest collections, talk 1-on-1 with industry specialists, and discover modern upgrades for your spaces.`,
      cta: "BOOK",
      hashtags: [cleanTag, "#showcaseevent", "#designconsultation"],
    };
  }

  return {
    title: topic ? `Premium ${topic} by ${biz.name}` : `Transform Your Living Spaces with ${biz.name}`,
    body: `Looking to elevate your interiors? Explore ${biz.name}'s exclusive collection of premium solutions, high-grade materials, and expert installation in ${biz.location}. Visit our showroom or contact us today for a personalized consultation.`,
    cta: "CALL",
    hashtags: [cleanTag, "#interiorupgrade", "#qualityfirst"],
  };
}

// ==========================================
// 1B. 1-CLICK AUTONOMOUS MAGIC (Groq + Unsplash)
// ==========================================

export type MagicPostInputImage = {
  id?: string;
  url: string;
  thumbnail?: string;
  photographer?: string;
  altText: string;
};

export type MagicPostOutput = {
  title: string;
  text: string;
  body: string;
  selectedImageUrl: string;
  selectedImage?: MagicPostInputImage;
  cta: "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";
  hashtags: string[];
  keyword: string;
};

export async function generateMagicPostContent(
  keyword: string,
  images: MagicPostInputImage[],
  type: "STANDARD" | "OFFER" | "EVENT" = "STANDARD",
  customBusiness?: Partial<BusinessProfileContext>,
): Promise<MagicPostOutput> {
  const biz = { ...(await getBusinessProfileContext()), ...(customBusiness || {}) };

  const imageSummaries = images.map((img, i) => ({
    index: i + 1,
    url: img.url,
    altText: img.altText || `${keyword} photography`,
  }));

  const prompt = `You are an expert Local SEO copywriter and visual curator for "${biz.name}", a premier ${biz.category} in ${biz.location}.
Business: ${biz.name}, ${biz.location}.
Post Type: ${type}
Target Focus Keyword: "${keyword}"

Below are 10 available high-resolution Unsplash photos:
${JSON.stringify(imageSummaries, null, 2)}

Your Tasks:
1. Write a punchy, high-converting Google Business Profile post (80-140 words) centered around "${keyword}" with clear local appeal.
2. Review the list of available Unsplash images above and INTELLIGENTLY SELECT the single best image URL whose description and visual subject most accurately matches the post you wrote.
3. Choose the ideal CTA button: "CALL", "BOOK", "LEARN_MORE", or "ORDER".

Respond in strict JSON with this exact schema:
{
  "title": "Compelling headline under 60 chars",
  "text": "The full engaging Google post copy (80-140 words)",
  "selectedImageUrl": "The exact selected URL from the provided image list",
  "cta": "CALL" | "BOOK" | "LEARN_MORE" | "ORDER",
  "hashtags": ["#${biz.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}", "#${keyword.replace(/\\s+/g, "").toLowerCase()}", ...]
}
Return ONLY valid raw JSON without markdown code fences.`;

  const fallbackSelectedImage = images[0] || {
    url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=1200&q=80",
    altText: "Natural Oak Parquet Hardwood Living Room Floor",
  };

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: "You output strictly valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as {
      title?: string;
      text?: string;
      body?: string;
      selectedImageUrl?: string;
      cta?: "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";
      hashtags?: string[];
    };

    const textContent = parsed.text || parsed.body;
    if (textContent && textContent.length > 20) {
      let matchedImage = images.find((img) => img.url === parsed.selectedImageUrl);
      if (!matchedImage && images.length > 0) {
        matchedImage = images[0];
      }

      return {
        title: parsed.title || `Transform Your Spaces with ${keyword}`,
        text: textContent,
        body: textContent,
        selectedImageUrl: matchedImage ? matchedImage.url : fallbackSelectedImage.url,
        selectedImage: matchedImage || fallbackSelectedImage,
        cta: parsed.cta || (type === "OFFER" ? "ORDER" : "CALL"),
        hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
          ? parsed.hashtags.slice(0, 6)
          : [`#${biz.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`, `#${keyword.replace(/\\s+/g, "").toLowerCase()}`],
        keyword,
      };
    }

    return null;
  }, CONTENT_MODEL);

  if (result) return result;

  const fallbackPost = getFallbackPost(biz, keyword, type);
  return {
    title: fallbackPost.title,
    text: fallbackPost.body,
    body: fallbackPost.body,
    selectedImageUrl: fallbackSelectedImage.url,
    selectedImage: fallbackSelectedImage,
    cta: fallbackPost.cta,
    hashtags: fallbackPost.hashtags,
    keyword,
  };
}

// Backward-compatible wrapper for cron/auto-post
export async function generateLocalPost(): Promise<GeneratedPostContent> {
  return generatePostContent();
}

// ==========================================
// 2. Q&A GENERATION
// ==========================================

export type QAPair = {
  question: string;
  answer: string;
};

export async function generateQA(customBusiness?: Partial<BusinessProfileContext>): Promise<QAPair[]> {
  const biz = { ...(await getBusinessProfileContext()), ...(customBusiness || {}) };

  const prompt = `You are a Local SEO specialist for "${biz.name}", a top-rated ${biz.category} located in ${biz.location}.
Generate exactly 2 unique, authentic customer questions and authoritative owner answers that target high-intent local customer queries and search terms for ${biz.name}.

Format your response as strict JSON:
{
  "faqs": [
    {
      "question": "Realistic, natural customer inquiry (15-30 words)?",
      "answer": "Warm, expert owner response from ${biz.name} highlighting quality, customer satisfaction, and service details in ${biz.location} (40-80 words)."
    },
    {
      "question": "Second unique customer question?",
      "answer": "Second expert owner answer."
    }
  ]
}
Return ONLY valid raw JSON.`;

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: "You output strictly valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as { faqs?: QAPair[] };

    if (Array.isArray(parsed.faqs) && parsed.faqs.length >= 2) {
      return parsed.faqs.slice(0, 2).map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }));
    }
    return null;
  }, FAST_MODEL);

  return result || getFallbackQA(biz);
}

function getFallbackQA(biz?: BusinessProfileContext): QAPair[] {
  const name = biz?.name || DEFAULT_BUSINESS_NAME;
  const loc = biz?.location || DEFAULT_LOCATION;

  return [
    {
      question: `What makes ${name}'s products and installation services stand out in ${loc}?`,
      answer: `At ${name}, we provide premium materials, certified craftsmanship, and complete post-installation support in ${loc}. All our products are tested for long-lasting durability, moisture resistance, and seamless finish with manufacturer warranty.`,
    },
    {
      question: `Do you provide on-site consultations and measurements before booking with ${name}?`,
      answer: `Yes! ${name} offers complimentary on-site measurement consultations across ${loc}. Our certified specialists inspect the site, provide product samples, and deliver accurate estimates tailored to your project requirements.`,
    },
  ];
}

export async function generateQASeed(): Promise<QAPair> {
  const list = await generateQA();
  return list[0] || getFallbackQA()[0];
}

// ==========================================
// 3. REVIEW REPLY GENERATION
// ==========================================

export type ReviewReplyInput = {
  reviewerName?: string;
  starRating: number;
  comment?: string;
  businessName?: string;
  tone?: "warm" | "professional" | "concise" | "apologetic";
  injectKeyword?: string;
};

export type ReviewReplyOutput = {
  reply: string;
  keywords: string[];
  tone: "warm" | "professional" | "concise" | "apologetic";
};

export function generateDeterministicReply(params: ReviewReplyInput): ReviewReplyOutput {
  const {
    reviewerName,
    starRating,
    comment,
    businessName = DEFAULT_BUSINESS_NAME,
    tone = "warm",
    injectKeyword,
  } = params;

  const nameGreeting = reviewerName ? `, ${reviewerName}` : "";
  const isRatingOnly =
    !comment ||
    comment.trim() === "" ||
    comment.toLowerCase().includes("(no written comment)");

  const keywordsUsed: string[] = [];
  if (injectKeyword) keywordsUsed.push(injectKeyword);

  // 1-2 Stars (Apologetic / High Empathy)
  if (starRating <= 2) {
    return {
      reply: `Dear ${reviewerName || "Valued Customer"}, we are truly sorry to hear that your experience did not meet our high expectations. At ${businessName}, craftsmanship, customer trust, and prompt service are our top priorities. Please contact our team directly so we can understand what occurred and make things right for you immediately.`,
      keywords: [businessName, "customer support"],
      tone: "apologetic",
    };
  }

  // 3 Stars (Balanced & Attentive)
  if (starRating === 3) {
    return {
      reply: `Thank you for sharing your feedback${nameGreeting}. We appreciate your honest rating and are continually striving to improve our services and customer satisfaction. Please let us know if there is anything we can do to elevate your experience with ${businessName}.`,
      keywords: [businessName],
      tone: "professional",
    };
  }

  // 4-5 Stars: Rating-Only Review
  if (isRatingOnly) {
    let reply = `Thank you so much for the wonderful ${starRating}-star rating${nameGreeting}! We truly appreciate your trust in ${businessName} and are honored to serve you.`;
    if (injectKeyword) {
      reply += ` If you ever need further assistance with ${injectKeyword} or ongoing care, our team is always here to help.`;
    }
    return {
      reply,
      keywords: [businessName, ...(injectKeyword ? [injectKeyword] : ["premium quality"])],
      tone: tone === "concise" ? "concise" : "warm",
    };
  }

  // 4-5 Stars with Written Comment
  if (tone === "concise") {
    let reply = `Thank you${nameGreeting}! We're thrilled you had a great experience with ${businessName}.`;
    if (injectKeyword) {
      reply += ` We're delighted you love your ${injectKeyword} from ${businessName}. Looking forward to serving you again!`;
    }
    return {
      reply,
      keywords: [businessName, ...(injectKeyword ? [injectKeyword] : [])],
      tone: "concise",
    };
  }

  if (tone === "professional") {
    let reply = `Thank you for your valuable feedback${nameGreeting}. The entire team at ${businessName} takes immense pride in delivering precision work and superior materials.`;
    if (injectKeyword) {
      reply += ` We are especially pleased that your experience with our ${injectKeyword} met your expectations.`;
    }
    return {
      reply,
      keywords: [businessName, ...(injectKeyword ? [injectKeyword] : ["quality service"])],
      tone: "professional",
    };
  }

  // Default: Warm & Grateful
  let reply = `Thank you so much for your kind words${nameGreeting}! We're delighted to know that you enjoyed our service and that our team transformed your space beautifully.`;
  if (injectKeyword) {
    reply = `Thank you so much${nameGreeting}! We are so pleased to hear that you love your new ${injectKeyword} and had a seamless experience with ${businessName}. We look forward to assisting you again in the future!`;
  }

  return {
    reply,
    keywords: [businessName, ...(injectKeyword ? [injectKeyword] : ["customer service", "quality guaranteed"])],
    tone: "warm",
  };
}

export async function generateReviewReply(
  inputOrText: ReviewReplyInput | string,
  legacyRating?: number,
  legacyBusinessName?: string,
): Promise<ReviewReplyOutput> {
  const biz = await getBusinessProfileContext();

  let params: ReviewReplyInput;
  if (typeof inputOrText === "string") {
    params = {
      comment: inputOrText,
      starRating: legacyRating || 5,
      businessName: legacyBusinessName || biz.name,
      tone: legacyRating && legacyRating <= 2 ? "apologetic" : "warm",
    };
  } else {
    params = {
      ...inputOrText,
      businessName: inputOrText.businessName || biz.name,
    };
  }

  const {
    reviewerName,
    starRating,
    comment,
    businessName = biz.name,
    tone = starRating <= 2 ? "apologetic" : "warm",
    injectKeyword,
  } = params;

  const prompt = `You are writing a Google Business Profile review reply on behalf of "${businessName}", located in ${biz.location}.
Reviewer: ${reviewerName || "A Google customer"}
Star Rating: ${starRating}/5
Customer Review Comment: ${comment ? `"${comment}"` : "(No written text, rating only)"}
Desired Tone: ${tone}
${injectKeyword ? `Naturally weave in this keyword: "${injectKeyword}".` : "Mention our services naturally."}

Guidelines:
- 1-2 stars: High empathy, sincere apology, invite to resolve privately. DO NOT force promotional keywords.
- 3 stars: Balanced, grateful for constructive feedback, commitment to quality.
- 4-5 stars: Warm, appreciative, personalized to any mentioned product or service, natural SEO.
- Length: 2 to 4 sentences maximum.

Respond in strict JSON:
{
  "reply": "The response string",
  "keywords": ["keyword1", "keyword2"],
  "tone": "${tone}"
}
Return ONLY valid JSON.`;

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: "You output strictly valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: starRating <= 2 ? 0.3 : 0.6,
      max_tokens: 450,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as ReviewReplyOutput;

    if (parsed.reply && parsed.reply.trim().length > 10) {
      return {
        reply: parsed.reply.trim(),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [businessName],
        tone: parsed.tone || tone,
      };
    }
    return null;
  }, FAST_MODEL);

  return result || generateDeterministicReply(params);
}

// ==========================================
// 4. KEYWORD EXTRACTION
// ==========================================

export async function extractSEOKeywords(profileData: {
  title?: string;
  category?: string;
  categories?: string[];
  description?: string;
}): Promise<string[]> {
  const biz = await getBusinessProfileContext();

  const title = profileData.title || biz.name;
  const category = profileData.category || biz.category;

  const prompt = `Given this Google Business Profile:
Title: ${title}
Primary Category: ${category}
Additional Categories: ${(profileData.categories || []).join(", ")}
Description: ${profileData.description || `Leading ${category} in ${biz.location}`}

Extract 10-12 high-intent, local commercial SEO keywords for Google Business Profile optimization.
Respond in strict JSON:
{
  "keywords": ["keyword 1", "keyword 2", ...]
}
Return ONLY valid JSON.`;

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: "You output strictly valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as { keywords?: string[] };

    if (Array.isArray(parsed.keywords) && parsed.keywords.length >= 5) {
      return parsed.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    }
    return null;
  }, FAST_MODEL);

  return result || DEFAULT_KEYWORDS;
}

// ==========================================
// 6. BUSINESS DESCRIPTION SEO OPTIMIZER
// ==========================================

export type GenerateDescriptionOptions = {
  businessName?: string;
  primaryCategory?: string;
  additionalCategories?: string[];
  location?: string;
  keywords?: string[];
};

export async function generateBusinessDescription(
  options?: GenerateDescriptionOptions,
): Promise<string> {
  const biz = await getBusinessProfileContext();
  const name = options?.businessName?.trim() || biz.name;
  const category = options?.primaryCategory?.trim() || biz.category;
  const categories = options?.additionalCategories?.length
    ? options.additionalCategories.join(", ")
    : "Wood and laminate flooring supplier, Flooring contractor, Interior designer";
  const location = options?.location?.trim() || biz.location;
  const keywords = options?.keywords?.length
    ? options.keywords.join(", ")
    : "wooden flooring, laminate flooring, herringbone, deck tiles, SPC vinyl flooring, Gurgaon, Delhi NCR";

  const prompt = `You are an elite Local SEO copywriter specializing in Google Business Profiles (GMB/GBP).
Generate a compelling, high-converting, strictly SEO-optimized business description for:
Business Name: "${name}"
Primary Category: ${category}
Additional Categories: ${categories}
Location: ${location}

STRICT REQUIREMENTS:
1. MAXIMUM LENGTH: Keep total length strictly between 580 and 700 characters (Google Business Profile hard limit is 750 characters).
2. NEVER cut off mid-sentence. You MUST finish the copy with a complete call-to-action sentence ending with a period.
3. Structure:
   - Hook: Establish "${name}" as Gurgaon and Delhi NCR's premier flooring and interior surface specialist.
   - Core Offerings: Mention wooden flooring, laminate, herringbone parquet, exterior deck tiles, balcony flooring, SPC vinyl, PU stone wall panels, and louvers.
   - Value & Service: Highlight bespoke consultation, precision installation, manufacturer warranties, and prompt dispatch across Gurgaon.
   - Call to Action: Polite invitation to visit the Gurgaon showroom or book an on-site sample consultation.
4. Natural Local SEO keyword integration without keyword stuffing.
5. Return ONLY the plain text description. Do NOT include markdown formatting, bullet points, quotes, or conversational explanations.`;

  const result = await executeWithGroq(async (groq, modelToUse) => {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            "You are an expert Google Business Profile copywriter. Return ONLY the raw business description text between 580 and 700 characters with zero markdown or preamble. Always end with a complete sentence.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 350,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (text && text.length >= 100) {
      if (text.length > 745) {
        const trimmed = text.slice(0, 745);
        const lastPeriod = trimmed.lastIndexOf(".");
        if (lastPeriod > 450) {
          return trimmed.slice(0, lastPeriod + 1).trim();
        }
        return trimmed.trim();
      }
      return text;
    }
    return null;
  }, CONTENT_MODEL);

  if (result) return result;

  // Rock-solid fallback tailored for Goals Floors under 750 chars (699 chars)
  return "Goals Floors is Gurgaon's premier destination for luxury wooden flooring, laminate flooring, herringbone parquet, and engineered timber solutions. Serving homeowners, architects, and designers across Gurgaon and Delhi NCR, we specialize in high-durability surfaces, weather-resistant exterior deck tiles, balcony flooring, and modern SPC vinyl. Our expert team delivers end-to-end service including on-site moisture testing, subfloor leveling, precision dust-free installation, and comprehensive warranties. Whether renovating an apartment or designing a corporate office, Goals Floors brings enduring elegance to every step. Visit our showroom or call today for on-site samples.";
}
