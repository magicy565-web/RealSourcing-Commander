/**
 * Whisper 视频转录服务 (Phase 3 Sprint 3.2)
 *
 * 流程：
 *   1. 从火山引擎 VOD 获取视频播放地址
 *   2. 下载视频到临时文件（最大 25MB，Whisper API 限制）
 *   3. 调用 OpenAI Whisper API (whisper-1) 转录
 *   4. 将转录文本写回 feed_items.transcript
 *   5. 清理临时文件
 *
 * 注意：
 *   - 转录为异步操作，通过 transcript_status 字段追踪进度
 *   - 超过 25MB 的视频仅截取前 25MB（音频部分）
 *   - 支持中英文混合转录（language: 'zh'）
 */
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import OpenAI from 'openai';
import db from '../db/index.js';
import vodService from '../lib/volcengine-vod.js';

const openai = new OpenAI();
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — Whisper API 限制
const VOLC_SPACE_NAME = process.env.VOLC_SPACE_NAME || 'realsourcing-commander';

/**
 * 下载 URL 到临时文件，返回临时文件路径
 * 若文件超过 MAX_FILE_SIZE，截断下载
 */
async function downloadToTemp(url: string, ext = 'mp4'): Promise<string> {
  const tmpPath = join(tmpdir(), `whisper-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RealSourcing-Commander/5.0' },
  });

  if (!response.ok) {
    throw new Error(`下载视频失败: HTTP ${response.status}`);
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  if (contentLength > 0 && contentLength > MAX_FILE_SIZE) {
    console.warn(`[Whisper] 视频文件 ${contentLength} bytes 超过 25MB，将截断下载`);
  }

  const writer = createWriteStream(tmpPath);
  let downloaded = 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取视频流');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloaded += value.length;
      writer.write(value);
      if (downloaded >= MAX_FILE_SIZE) {
        console.warn(`[Whisper] 已截断至 ${MAX_FILE_SIZE} bytes`);
        break;
      }
    }
  } finally {
    reader.releaseLock();
    writer.end();
  }

  // 等待写入完成
  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return tmpPath;
}

/**
 * 对单个视频 feed_item 执行 Whisper 转录
 * 该函数为异步非阻塞，调用后立即返回，转录结果通过 DB 更新
 */
export async function transcribeVideo(itemId: string): Promise<void> {
  const item = db.prepare(`
    SELECT id, media_url, title, transcript_status FROM feed_items WHERE id = ?
  `).get(itemId) as any;

  if (!item) throw new Error(`feed_item ${itemId} 不存在`);
  if (item.transcript_status === 'processing') {
    throw new Error('转录正在进行中，请勿重复触发');
  }
  if (item.transcript_status === 'done') {
    throw new Error('该视频已完成转录');
  }

  // 标记为处理中
  db.prepare(`UPDATE feed_items SET transcript_status = 'processing' WHERE id = ?`).run(itemId);

  let tmpPath: string | null = null;
  try {
    // 提取 vid
    const vid = item.media_url?.startsWith('vid:') ? item.media_url.slice(4) : item.media_url;
    if (!vid) throw new Error('视频 VID 为空，无法转录');

    // 获取播放地址
    const playResult = await vodService.getPlayInfo(vid, VOLC_SPACE_NAME);
    const playInfoList = (playResult as any)?.PlayInfoList || [];
    const mp4Play = playInfoList.find((p: any) => p.Format === 'mp4') || playInfoList[0];
    const playUrl = mp4Play?.MainPlayUrl || '';

    if (!playUrl) throw new Error('无法获取视频播放地址');

    // 下载视频
    console.log(`[Whisper] 开始下载视频 ${itemId} (vid: ${vid})`);
    tmpPath = await downloadToTemp(playUrl, 'mp4');

    // 调用 Whisper API
    console.log(`[Whisper] 开始转录 ${itemId}`);
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpPath) as any,
      model: 'whisper-1',
      language: 'zh',
      response_format: 'text',
    });

    const transcript = typeof transcription === 'string' ? transcription : (transcription as any).text || '';

    // 保存转录结果
    db.prepare(`
      UPDATE feed_items SET transcript = ?, transcript_status = 'done' WHERE id = ?
    `).run(transcript, itemId);

    console.log(`[Whisper] 转录完成 ${itemId}，共 ${transcript.length} 字`);
  } catch (err: any) {
    console.error(`[Whisper] 转录失败 ${itemId}:`, err?.message || err);
    db.prepare(`
      UPDATE feed_items SET transcript_status = 'failed' WHERE id = ?
    `).run(itemId);
    throw err;
  } finally {
    // 清理临时文件
    if (tmpPath && existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch {}
    }
  }
}
