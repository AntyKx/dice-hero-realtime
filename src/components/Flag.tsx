import { teamFlagUrl } from '../worldCup'

export default function Flag({ team }: { team: string }) {
  const url = teamFlagUrl(team)
  if (!url) return null
  return <img src={url} alt="" className="wc-flag" />
}
