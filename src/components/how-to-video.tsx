"use client";
// The "how it works" walkthrough video for parents and students, in Amharic or English,
// kept in the public Supabase "media" bucket.
import { useState } from "react";

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media`;
const LANGS = [["amharic", "አማርኛ"], ["english", "English"]] as const;

export function HowToVideo() {
  const [lang, setLang] = useState<(typeof LANGS)[number][0]>("amharic");
  return (
    <details className="panel howto">
      <summary>
        <span className="ico">🎬</span>
        <span className="txt"><b>እንዴት እንደሚሠራ ይመልከቱ</b><small>How it works · a 4-minute video</small></span>
        <span className="st">Watch</span>
      </summary>
      <div className="howto-langs" role="group" aria-label="Video language">
        {LANGS.map(([k, label]) => <button key={k} type="button" aria-pressed={lang === k} onClick={() => setLang(k)}>{label}</button>)}
      </div>
      <video key={lang} controls playsInline preload="none" poster={`${MEDIA}/how-to-${lang}.jpg`} src={`${MEDIA}/how-to-${lang}.mp4`} />
    </details>
  );
}
