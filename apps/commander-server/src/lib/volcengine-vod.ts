/**
 * 火山引擎视频点播 (VOD) 服务封装
 * 使用 HMAC-SHA256 签名机制直接调用 REST API
 * 
 * API 版本说明：
 * - 上传相关 (ApplyUploadInfo / CommitUploadInfo): Version=2020-08-01
 * - 播放相关 (GetPlayInfo): Version=2020-08-01
 * - 媒资管理 (GetMediaInfos): Version=2022-12-01
 */
import crypto from 'crypto';
import axios from 'axios';

const VOD_HOST = 'vod.volcengineapi.com';
const VOD_REGION = 'cn-north-1';
const VOD_SERVICE = 'vod';

const AK = process.env.VOLC_ACCESS_KEY_ID || '';
const SK = process.env.VOLC_SECRET_ACCESS_KEY || '';

// ─── 签名工具 ───────────────────────────────────────────────────────────────

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate = hmacSHA256(secretKey, date);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, 'request');
  return kSigning;
}

function buildSignedRequest(action: string, version: string, params: Record<string, string | number>, body: string = '') {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  // Query string
  const queryParams: Record<string, string> = {
    Action: action,
    Version: version,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  };
  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  // Headers
  const contentHash = sha256Hex(body);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'host': VOD_HOST,
    'x-content-sha256': contentHash,
    'x-date': timeStr,
  };
  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders = signedHeaderKeys.join(';');

  // Canonical request
  const canonicalRequest = [
    'GET',
    '/',
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join('\n');

  // String to sign
  const credentialScope = `${dateStr}/${VOD_REGION}/${VOD_SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    timeStr,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = getSigningKey(SK, dateStr, VOD_REGION, VOD_SERVICE);
  const signature = hmacSHA256(signingKey, stringToSign).toString('hex');

  // Authorization header
  const authorization = `HMAC-SHA256 Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${VOD_HOST}/?${canonicalQueryString}`,
    headers: {
      ...headers,
      Authorization: authorization,
    },
  };
}

// ─── VOD API 封装 ─────────────────────────────────────────────────────────────

/**
 * 获取视频上传地址和凭证（ApplyUploadInfo，版本 2020-08-01）
 * 返回 UploadAddress 和 UploadAuth，前端用这两个字段直传 TOS
 */
export async function applyUploadInfo(spaceName: string) {
  // FileType 默认为 media，上传音视频时无需传入
  const { url, headers } = buildSignedRequest('ApplyUploadInfo', '2020-08-01', {
    SpaceName: spaceName,
  });
  const res = await axios.get(url, { headers });
  return res.data;
}

/**
 * 确认上传完成（CommitUploadInfo，版本 2020-08-01）
 * 前端上传完成后，调用此接口通知 VOD 服务端完成上传
 */
export async function commitUploadInfo(spaceName: string, sessionKey: string) {
  const { url, headers } = buildSignedRequest('CommitUploadInfo', '2020-08-01', {
    SpaceName: spaceName,
    SessionKey: sessionKey,
  });
  const res = await axios.get(url, { headers });
  return res.data;
}

/**
 * 获取视频播放信息（GetPlayInfo，版本 2020-08-01）
 * 通过 Vid 获取真实播放地址（HLS/MP4）
 */
export async function getPlayInfo(vid: string, spaceName: string) {
  const { url, headers } = buildSignedRequest('GetPlayInfo', '2020-08-01', {
    Vid: vid,
    SpaceName: spaceName,
    Ssl: 1,
    NeedThumbs: 1,
  });
  const res = await axios.get(url, { headers });
  return res.data;
}

/**
 * 查询媒资信息（GetMediaInfos，版本 2022-12-01）
 * 获取视频封面图、时长等元数据
 */
export async function getMediaInfo(vid: string, spaceName: string) {
  const { url, headers } = buildSignedRequest('GetMediaInfos', '2022-12-01', {
    Vids: vid,
    SpaceName: spaceName,
  });
  const res = await axios.get(url, { headers });
  return res.data;
}

/**
 * 获取媒资列表（GetMediaList，版本 2022-12-01）
 */
export async function listMediaInfos(spaceName: string, pageNum: number = 1, pageSize: number = 20) {
  const { url, headers } = buildSignedRequest('GetMediaList', '2022-12-01', {
    SpaceName: spaceName,
    Offset: (pageNum - 1) * pageSize,
    PageSize: pageSize,
  });
  const res = await axios.get(url, { headers });
  return res.data;
}

/**
 * 获取上传凭证（用于管理员后台，返回 ApplyUploadInfo 的结果）
 */
export async function getUploadAuthToken(spaceName: string) {
  return applyUploadInfo(spaceName);
}

export default {
  applyUploadInfo,
  commitUploadInfo,
  getPlayInfo,
  getMediaInfo,
  listMediaInfos,
  getUploadAuthToken,
};
