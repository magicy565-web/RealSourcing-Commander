/**
 * Commander 5.0 — 询盘数据 Hook
 * 从真实 API 获取数据，替代 mock 数据
 */
import { useState, useEffect, useCallback } from "react";
import { inquiriesApi, openclawApi, type Inquiry, type InquiryStats, type OpenClawStatus } from "@/lib/api";
import { toast } from "sonner";

export function useInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, statsData] = await Promise.all([
        inquiriesApi.list({ limit: 50 }),
        inquiriesApi.stats(),
      ]);
      setInquiries(listData.items);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // 每 30 秒自动刷新
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const updateInquiry = useCallback((updated: Inquiry) => {
    setInquiries(prev => prev.map(i => i.id === updated.id ? updated : i));
  }, []);

  const removeInquiry = useCallback((id: string) => {
    setInquiries(prev => prev.filter(i => i.id !== id));
  }, []);

  return {
    inquiries,
    stats,
    loading,
    error,
    refresh: fetchAll,
    updateInquiry,
    removeInquiry,
  };
}

export function useOpenClawStatus() {
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await openclawApi.status();
      setStatus(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch]);

  const simulateLead = useCallback(async () => {
    try {
      const result = await openclawApi.simulateLead();
      toast.success(result.message);
      return result;
    } catch (err: any) {
      toast.error(err.message ?? "模拟失败");
      return null;
    }
  }, []);

  return { status, loading, refresh: fetch, simulateLead };
}
