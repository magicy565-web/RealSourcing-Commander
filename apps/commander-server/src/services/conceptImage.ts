/**
 * AI 产品概念图生成服务 (Phase 3 Sprint 3.2)
 *
 * 流程：
 *   1. 从询盘信息提取产品名称、需求描述、目标市场
 *   2. 使用 GPT-4.1-mini 将中文产品信息翻译/优化为英文 DALL-E 提示词
 *   3. 调用 DALL-E 3 生成产品概念图（1024×1024）
 *   4. 将图片 URL 写回 inquiries.concept_image_url
 *
 * 注意：
 *   - DALL-E 3 生成的 URL 有效期约 1 小时，建议后续接入 S3/OSS 持久化
 *   - 生成为异步操作，通过 concept_image_status 追踪进度
 *   - 提示词优化确保生成商业产品摄影风格（白底、专业打光）
 */
import OpenAI from 'openai';
import db from '../db/index.js';

const openai = new OpenAI();

/**
 * 构建 DALL-E 提示词
 * 将询盘产品信息转化为专业的产品摄影提示词
 */
async function buildImagePrompt(params: {
  productName: string;
  requirements?: string;
  buyerCountry?: string;
  industry?: string;
}): Promise<string> {
  const { productName, requirements, buyerCountry, industry } = params;

  // 使用 GPT-4.1-mini 生成专业提示词
  const resp = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional product photography prompt engineer for DALL-E 3.
Your task is to create a concise, vivid English prompt for generating a high-quality product concept image.
Style requirements:
- Professional product photography on clean white background
- Soft studio lighting, sharp focus
- Show the product clearly with realistic materials and textures
- Include relevant context if helpful (e.g., room setting for furniture)
- Keep the prompt under 150 words
- Do NOT include text, labels, or watermarks in the description
- Do NOT mention people or faces`,
      },
      {
        role: 'user',
        content: `Product: ${productName}
${requirements ? `Requirements: ${requirements}` : ''}
${buyerCountry ? `Target market: ${buyerCountry}` : ''}
${industry ? `Industry: ${industry}` : ''}

Generate a DALL-E 3 prompt for a professional product concept image.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  const prompt = resp.choices[0]?.message?.content?.trim() || '';
  // 附加固定风格后缀确保质量
  return `${prompt} Professional product photography, white background, studio lighting, high resolution, commercial quality.`;
}

/**
 * 为询盘生成产品概念图（异步非阻塞）
 */
export async function generateConceptImage(inquiryId: string): Promise<void> {
  const inquiry = db.prepare(`
    SELECT id, product_name, requirements, buyer_country, concept_image_status
    FROM inquiries WHERE id = ?
  `).get(inquiryId) as any;

  if (!inquiry) throw new Error(`询盘 ${inquiryId} 不存在`);
  if (inquiry.concept_image_status === 'generating') {
    throw new Error('概念图正在生成中，请勿重复触发');
  }
  if (inquiry.concept_image_status === 'done') {
    throw new Error('该询盘已生成概念图');
  }

  if (!inquiry.product_name) {
    throw new Error('询盘缺少产品名称，无法生成概念图');
  }

  // 标记为生成中
  db.prepare(`UPDATE inquiries SET concept_image_status = 'generating' WHERE id = ?`).run(inquiryId);

  try {
    console.log(`[ConceptImage] 开始生成概念图 ${inquiryId} (${inquiry.product_name})`);

    // 构建提示词
    const prompt = await buildImagePrompt({
      productName: inquiry.product_name,
      requirements: inquiry.requirements,
      buyerCountry: inquiry.buyer_country,
    });

    console.log(`[ConceptImage] 提示词: ${prompt.slice(0, 100)}...`);

    // 调用 DALL-E 3
    const imageResp = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });

    const imageUrl = imageResp.data?.[0]?.url || '';
    if (!imageUrl) throw new Error('DALL-E 3 未返回图片 URL');

    // 保存结果
    db.prepare(`
      UPDATE inquiries SET concept_image_url = ?, concept_image_status = 'done' WHERE id = ?
    `).run(imageUrl, inquiryId);

    console.log(`[ConceptImage] 生成完成 ${inquiryId}: ${imageUrl.slice(0, 60)}...`);
  } catch (err: any) {
    console.error(`[ConceptImage] 生成失败 ${inquiryId}:`, err?.message || err);
    db.prepare(`
      UPDATE inquiries SET concept_image_status = 'failed' WHERE id = ?
    `).run(inquiryId);
    throw err;
  }
}
