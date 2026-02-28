/**
 * 火山引擎 VOD 服务封装 — 官方 SDK 版本 (Phase 3 重构)
 *
 * 从手动 HMAC-SHA256 签名方案迁移至 @volcengine/openapi 官方 SDK，
 * 降低维护成本，获得完整 API 覆盖和官方错误处理支持。
 *
 * 环境变量：
 *   VOLC_ACCESS_KEY_ID     火山引擎 Access Key ID
 *   VOLC_SECRET_ACCESS_KEY 火山引擎 Secret Access Key
 *   VOLC_SPACE_NAME        VOD 空间名称（默认 realsourcing-commander）
 *
 * 官方文档：https://www.volcengine.com/docs/4/83012
 */
import { vodOpenapi } from '@volcengine/openapi';

const AK = process.env.VOLC_ACCESS_KEY_ID || '';
const SK = process.env.VOLC_SECRET_ACCESS_KEY || '';

// 初始化 VodService 实例，通过构造函数传入凭证（推荐方式）
// serviceName 由 VodService 内部默认设置为 'vod'，无需手动传入
const vodService = new vodOpenapi.VodService();
vodService.setAccessKeyId(AK);
vodService.setSecretKey(SK);

// ─── 获取上传凭证（ApplyUploadInfo）────────────────────────────────────────────
/**
 * 申请 TOS 直传凭证。
 * 前端使用 StoreUri + Auth 直接 PUT 到 TOS，无需经过后端中转。
 */
export async function applyUploadInfo(spaceName: string) {
  const res = await vodService.ApplyUploadInfo({ SpaceName: spaceName });
  return res.Result;
}

// ─── 确认上传完成（CommitUploadInfo）──────────────────────────────────────────
/**
 * 前端上传完成后，通知 VOD 服务端完成上传流程，获取 Vid。
 */
export async function commitUploadInfo(spaceName: string, sessionKey: string) {
  const res = await vodService.CommitUploadInfo({
    SpaceName: spaceName,
    SessionKey: sessionKey,
  });
  return res.Result;
}

// ─── 获取视频播放信息（GetPlayInfo）───────────────────────────────────────────
/**
 * 通过 Vid 获取真实播放地址（HLS/MP4）及封面图。
 * spaceName 参数保留以兼容旧调用签名，SDK 版本无需传入。
 */
export async function getPlayInfo(vid: string, _spaceName?: string) {
  const res = await vodService.GetPlayInfo({ Vid: vid });
  return res.Result;
}

// ─── 查询媒资信息（GetMediaInfos）─────────────────────────────────────────────
/**
 * 获取视频封面图、时长等元数据。
 * spaceName 参数保留以兼容旧调用签名，SDK 版本通过 Vids 查询。
 */
export async function getMediaInfo(vid: string, _spaceName?: string) {
  const res = await vodService.GetMediaInfos({ Vids: vid });
  return res.Result;
}

// ─── 获取媒资列表（GetMediaList）──────────────────────────────────────────────
/**
 * 分页获取 VOD 空间内的媒资列表。
 */
export async function listMediaInfos(spaceName: string, pageNum = 1, pageSize = 20) {
  const offset = ((pageNum - 1) * pageSize).toString();
  const res = await vodService.GetMediaList({
    SpaceName: spaceName,
    Offset: offset,
    PageSize: pageSize.toString(),
  });
  return res.Result;
}

// ─── 获取上传凭证（兼容旧接口名称）──────────────────────────────────────────
/**
 * 兼容旧版 getUploadAuthToken 调用，内部委托给 applyUploadInfo。
 * 将官方 SDK 返回结构适配为旧版格式，保持 video-feed.ts 路由的兼容性。
 */
export async function getUploadAuthToken(spaceName: string) {
  const result = await applyUploadInfo(spaceName);
  return {
    Result: {
      Data: {
        // 官方 SDK: VodApplyUploadInfoResult.Data.UploadAddress
        UploadAddress: result?.Data?.UploadAddress ?? {},
      },
    },
  };
}

export default {
  applyUploadInfo,
  commitUploadInfo,
  getPlayInfo,
  getMediaInfo,
  listMediaInfos,
  getUploadAuthToken,
  // 暴露原始 VodService 实例，供高级用途（如 UploadMedia、StartWorkflow 等）
  vodService,
};
