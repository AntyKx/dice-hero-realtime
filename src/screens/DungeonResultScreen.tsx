import type { DungeonDef, DungeonDifficulty } from '../dungeon'
import type { Equipment } from '../types'
import { ROLE_LABEL } from '../equipment'
import AsterVowIcon from '../components/AsterVowIcon'
import { EQUIPMENT_SLOT_ICON, CHEST_ICON } from '../equipmentIconMeta'
import { getDungeonIcon } from '../iconMeta'

const CHEST_INFO: Record<DungeonDifficulty, { name: string; type: 'chest_normal' | 'chest_hero' | 'chest_legendary' }> = {
  normal:    { name: '一般寶箱', type: 'chest_normal' },
  hero:      { name: '英雄寶箱', type: 'chest_hero' },
  legendary: { name: '傳奇寶箱', type: 'chest_legendary' },
}

interface Props {
  dungeon: DungeonDef
  cleared: boolean
  floorsCleared: number
  goldEarned: number
  expEarned: number
  difficulty: DungeonDifficulty
  droppedItem: Equipment | null
  onRetry: () => void
  onBack: () => void
}

export default function DungeonResultScreen({
  dungeon, cleared, floorsCleared, goldEarned, expEarned, difficulty, droppedItem, onRetry, onBack,
}: Props) {
  const chest = CHEST_INFO[difficulty]
  return (
    <div className="dungeon-result-wrap">
      <div className="dr-card" style={{ '--dungeon-color': dungeon.color } as React.CSSProperties}>
        <div className="dr-icon"><AsterVowIcon name={cleared ? 'system-leaderboard' : 'system-warning'} size={36} /></div>
        <div className="dr-dungeon-name" style={{ color: dungeon.color }}><AsterVowIcon name={getDungeonIcon(dungeon.id)} size={20} /> {dungeon.name}</div>
        <div className="dr-status" style={{ color: cleared ? '#40ff88' : '#ff6060' }}>
          {cleared ? '地城通關！' : '挑戰失敗'}
        </div>

        <div className="dr-progress">
          <span className="dr-progress-label">通關節點</span>
          <span className="dr-progress-value">
            <span style={{ color: cleared ? '#40ff88' : '#ffaa40' }}>{floorsCleared}</span>
            <span style={{ color: '#888' }}> 個</span>
          </span>
        </div>

        {cleared && (
          <div className="dr-rewards">
            <div className="dr-rewards-title">獲得獎勵</div>

            {droppedItem && (
              <div className={`dr-reward-equip rarity-${droppedItem.rarity}`}>
                <div className="dr-equip-name">
                  <AsterVowIcon name={EQUIPMENT_SLOT_ICON[droppedItem.slot]} size={17} /> {droppedItem.name}
                  {droppedItem.requiredRole && (
                    <span className="eir-role" style={{ marginLeft: 6 }}>{ROLE_LABEL[droppedItem.requiredRole]}</span>
                  )}
                </div>
                <div className="dr-affixes">
                  {droppedItem.affixes.map(a => <span key={a.id} className="dr-affix">{a.label}</span>)}
                  {droppedItem.legendaryDesc && (
                    <span className="dr-affix dr-leg">✦ {droppedItem.legendaryDesc}</span>
                  )}
                </div>
              </div>
            )}

            <div className="dr-reward-row">
              <span><AsterVowIcon name="system-gold" size={15} /> {goldEarned} 金幣 → <AsterVowIcon name="system-stardust" size={15} /> {goldEarned} 星塵</span>
            </div>
            <div className="dr-reward-row">
              <span><AsterVowIcon name="system-talent" size={15} /> {expEarned} 英雄經驗值</span>
            </div>
            <div className="dr-reward-row">
              <span><AsterVowIcon name={CHEST_ICON[chest.type]} size={16} /> {chest.name} ×1（已入庫）</span>
            </div>
          </div>
        )}

        {!cleared && (
          <div className="dr-fail-tip">
            HP 在層與層之間延續，適當強化英雄裝備再嘗試吧。
          </div>
        )}

        <div className="dr-buttons">
          <button className="primary" onClick={onBack}>回到關卡選擇頁面</button>
        </div>
      </div>
    </div>
  )
}
