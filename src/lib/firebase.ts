import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
} from 'firebase/auth'
import type { User } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyAch0-MoIRA6Q1JRC36_3f3J3JUt_oOHu4',
  authDomain:        'diceherorpg.firebaseapp.com',
  projectId:         'diceherorpg',
  storageBucket:     'diceherorpg.firebasestorage.app',
  messagingSenderId: '455590682193',
  appId:             '1:455590682193:web:aee96934615699702f6270',
}

const app          = initializeApp(firebaseConfig)
export const auth  = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// ── Cloud save / load via Cloudflare Pages Function ───────────────────────

export type CloudBundle = { meta: string | null; run: string | null; updated_at?: string; player_name?: string | null }

export async function cloudSave(uid: string): Promise<void> {
  await fetch(`/save/${uid}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      meta:        localStorage.getItem('dice_hero_meta_v2'),
      run:         localStorage.getItem('dice_hero_run_v1'),
      player_name: localStorage.getItem('dh_player_name') || null,
    }),
  })
}

export async function cloudLoad(uid: string): Promise<CloudBundle | null> {
  const res = await fetch(`/save/${uid}`)
  const text = await res.text()
  if (!text || text === 'null') return null
  return JSON.parse(text) as CloudBundle
}

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
export type { User }
