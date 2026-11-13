import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import logo from '../../assets/logo.svg'
import { Button } from '../../components/Button'
import { Card, StatCard } from '../../components/Card'
import { TabHeader } from '../../components/Header'
import { GearIcon } from '../../components/icons'
import { getReviewOverview, type ReviewOverview } from '../../db/review'
import { estimateMinutes } from '../../lib/stats'
import { noDueText } from './copy'

/** 複習頁（首頁）：docs/PRD.md 3.1、Figma 1-1／1-2／1-3 */
export function HomePage() {
  const overview = useLiveQuery(() => getReviewOverview())

  return (
    <>
      <TabHeader
        title="複習"
        right={
          <Link to="/settings" aria-label="設定" className="-mr-3 flex size-12 items-center justify-center text-ink">
            <GearIcon size={24} />
          </Link>
        }
      />
      {overview && (overview.total === 0 ? <EmptyState /> : <Dashboard o={overview} />)}
    </>
  )
}

/** 1-2 還沒有錯題 */
export function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center px-6 pt-[18dvh] text-center">
      <img src={logo} alt="" width={120} height={120} />
      <h2 className="mt-4 font-heading text-section font-bold">還沒有錯題</h2>
      <p className="mt-3 text-small text-sub">
        先錄入你寫錯的題目，
        <br />
        系統會從隔天開始幫你安排複習。
      </p>
      <Button fullWidth={false} className="mt-6" onClick={() => navigate('/capture')}>
        新增第一題
      </Button>
    </div>
  )
}

function Dashboard({ o }: { o: ReviewOverview }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
      {o.todayCount > 0 ? (
        // 1-1 有待複習
        <Card fold className="p-5">
          <p className="text-small text-sub">今天要複習</p>
          <p className="mt-1 font-heading text-display font-bold">{o.todayCount} 題</p>
          <p className="mt-1 text-small text-sub">
            約 {estimateMinutes(o.todayCount)} 分鐘
            {o.deferred > 0 && `・另有 ${o.deferred} 題順延到明天`}
          </p>
          <Button className="mt-6" onClick={() => navigate('/review')}>
            開始複習
          </Button>
        </Card>
      ) : (
        // 1-3 今天沒有到期／今日已複習完
        <Card fold className="p-5">
          <h2 className="pr-6 font-heading text-section font-bold">今天沒有要複習的題目</h2>
          <p className="mt-2 text-small text-sub">{noDueText(o)}</p>
          {o.addedToday > 0 && <p className="mt-2 text-caption text-sub">今天新增的錯題會從明天開始複習。</p>}
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/capture')}>
            去新增錯題
          </Button>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="連續天數" value={`${o.streak} 天`} />
        <StatCard label="錯題總數" value={String(o.total)} />
        <StatCard label="本週新增" value={String(o.weekNew)} />
      </div>
    </div>
  )
}
