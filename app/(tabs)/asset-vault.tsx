/**
 * AssetVault — 数字资产托管库
 * 核心功能：上传资产、查看激活率、AI 训练进度
 */
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, Zap, CheckCircle, Clock, Lock, ChevronRight } from 'lucide-react-native';
import { hapticLight, hapticMedium } from '@/constants/haptics';
import { C } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Asset {
  id: string;
  name: string;
  type: 'product' | 'document' | 'case' | 'media';
  status: 'active' | 'training' | 'pending';
  uploadDate: string;
  size: string;
  activationScore: number;
}

const MOCK_ASSETS: Asset[] = [
  { id: '1', name: '产品目录 2024 Q4', type: 'product', status: 'active', uploadDate: '2024-12-01', size: '12.5 MB', activationScore: 95 },
  { id: '2', name: '工厂实力展示视频', type: 'media', status: 'training', uploadDate: '2024-12-08', size: '245 MB', activationScore: 68 },
  { id: '3', name: '成功案例 - 沙特项目', type: 'case', status: 'active', uploadDate: '2024-11-15', size: '8.3 MB', activationScore: 87 },
  { id: '4', name: '商务合作协议模板', type: 'document', status: 'pending', uploadDate: '2024-12-10', size: '2.1 MB', activationScore: 0 },
];

const TYPE_LABEL = {
  product: '产品资料',
  document: '商务文件',
  case: '成功案例',
  media: '多媒体',
};

const STATUS_CONFIG = {
  active: { color: C.green, label: '已激活', icon: CheckCircle },
  training: { color: C.amber, label: '训练中', icon: Zap },
  pending: { color: C.t3, label: '待处理', icon: Clock },
};

function ActivationRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <View style={{ position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="45"
          fill="none"
          stroke={C.PL}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: C.t1 }}>{score}%</Text>
        <Text style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>激活率</Text>
      </View>
    </View>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const config = STATUS_CONFIG[asset.status];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: asset.status === 'active' ? C.green + '30' : 'rgba(255,255,255,0.08)',
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Icon */}
      <View style={{ backgroundColor: config.color + '20', borderRadius: 12, padding: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={20} color={config.color} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ color: C.t1, fontSize: 14, fontWeight: '600' }}>{asset.name}</Text>
          <View style={{ backgroundColor: config.color + '30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: config.color, fontSize: 10, fontWeight: '600' }}>{config.label}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={{ color: C.t3, fontSize: 11 }}>{TYPE_LABEL[asset.type]}</Text>
          <Text style={{ color: C.t3, fontSize: 11 }}>·</Text>
          <Text style={{ color: C.t3, fontSize: 11 }}>{asset.size}</Text>
        </View>
      </View>

      {/* Score or Arrow */}
      {asset.status === 'active' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>{asset.activationScore}%</Text>
          <Text style={{ color: C.t3, fontSize: 10, marginTop: 2 }}>激活度</Text>
        </View>
      )}
      {asset.status !== 'active' && <ChevronRight size={20} color={C.t3} />}
    </MotiView>
  );
}

export default function AssetVaultScreen() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const totalScore = Math.round(MOCK_ASSETS.filter(a => a.status === 'active').reduce((sum, a) => sum + a.activationScore, 0) / MOCK_ASSETS.filter(a => a.status === 'active').length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
            <Text style={{ color: C.t1, fontSize: 22, fontWeight: '700' }}>资产库</Text>
            <Text style={{ color: C.t2, fontSize: 13, marginTop: 2 }}>您的数字资产激活中心</Text>
          </View>

          {/* Activation Ring */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <ActivationRing score={totalScore} />
            <Text style={{ color: C.t2, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              {MOCK_ASSETS.filter(a => a.status === 'active').length} 个资产已激活
            </Text>
          </View>

          {/* Upload Section */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Pressable onPress={() => { hapticMedium(); setShowUploadModal(true); }}>
              <LinearGradient
                colors={['rgba(124,58,237,0.2)', 'rgba(124,58,237,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: C.PL + '40',
                  borderStyle: 'dashed',
                  padding: 24,
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Upload size={28} color={C.PL} />
                <Text style={{ color: C.t1, fontSize: 16, fontWeight: '600' }}>上传新资产</Text>
                <Text style={{ color: C.t2, fontSize: 12 }}>产品资料、案例、视频等</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Assets List */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.t1, fontSize: 16, fontWeight: '600' }}>已上传资产</Text>
              <Text style={{ color: C.t2, fontSize: 13 }}>{MOCK_ASSETS.length} 个</Text>
            </View>

            {MOCK_ASSETS.map(asset => <AssetCard key={asset.id} asset={asset} />)}
          </View>

          {/* Tips */}
          <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: 20 }}>
            <View style={{ backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: C.PL, padding: 14 }}>
              <Text style={{ color: C.PL, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>💡 提示</Text>
              <Text style={{ color: C.t2, fontSize: 12, lineHeight: 18 }}>
                上传更多高质量资产可以帮助 AI 更深入地学习您的业务，从而提供更精准的市场机会和客户推荐。
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
