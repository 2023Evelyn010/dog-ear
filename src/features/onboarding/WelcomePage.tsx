import { useNavigate } from 'react-router'
import logo from '../../assets/logo.svg'
import { Button } from '../../components/Button'
import { markOnboardingSeen } from '../../db/settings'

const STEPS = ['點 Safari 下方的 ⋯，再點「分享」', '選擇「加入主畫面」', '之後從主畫面的 Dog-ear 圖示開啟']

/** 首次開啟：加入主畫面引導（docs/PRD.md 3.8、Figma 5-3） */
export function WelcomePage() {
  const navigate = useNavigate()
  const done = async () => {
    try {
      await markOnboardingSeen()
    } finally {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-[max(48px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <img src={logo} alt="" width={72} height={72} className="-ml-1" />
      <h1 className="mt-5 font-heading text-title font-bold">把 Dog-ear 加入主畫面</h1>
      <p className="mt-3 text-small text-sub">
        iPhone 會清除太久沒開啟的網站資料。加入主畫面後，你的錯題會保存得更安全。
      </p>
      <ol className="mt-5 flex flex-col gap-4 rounded-card border border-line bg-card px-5 py-5 text-small">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-4">
            <span className="text-sub">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <SafariSketch />
      <div className="mt-auto flex flex-col items-center gap-2 pt-8">
        <Button onClick={() => void done()}>我知道了</Button>
        <Button variant="text" fullWidth={false} onClick={() => void done()}>
          先略過
        </Button>
      </div>
    </div>
  )
}

/** 操作示意圖：iOS Safari 下方網址列的 ⋯ → 選單裡的「分享」 */
function SafariSketch() {
  return (
    <figure className="mt-4 rounded-card bg-photo px-4 pt-5 pb-4" aria-label="示意圖：點 Safari 下方的 ⋯，再點「分享」">
      <svg viewBox="0 0 310 150" className="w-full" aria-hidden="true">
        {/* 選單 */}
        <rect x="150" y="4" width="150" height="88" rx="12" className="fill-card stroke-line" />
        <rect x="158" y="12" width="134" height="32" rx="8" className="fill-primary-soft" />
        <text x="172" y="33" className="fill-primary text-[13px]">
          分享
        </text>
        <g className="stroke-primary" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M272 20v12M268 24l4-4 4 4" />
          <path d="M268 27h-2v10h12V27h-2" />
        </g>
        <text x="172" y="72" className="fill-sub text-[13px]">
          加入書籤
        </text>
        {/* 網址列 */}
        <rect x="10" y="106" width="290" height="40" rx="20" className="fill-card stroke-line" />
        <g className="stroke-sub" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 120l-6 6 6 6" />
        </g>
        <text x="74" y="131" className="fill-sub text-[12px]">
          dog-ear-two.vercel.app
        </text>
        <circle cx="276" cy="126" r="15" className="fill-primary-soft stroke-primary" strokeWidth="1.5" />
        <g className="fill-primary">
          <circle cx="269" cy="126" r="1.8" />
          <circle cx="276" cy="126" r="1.8" />
          <circle cx="283" cy="126" r="1.8" />
        </g>
        {/* ⋯ → 選單 */}
        <path d="M276 108V96" className="stroke-primary" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    </figure>
  )
}
