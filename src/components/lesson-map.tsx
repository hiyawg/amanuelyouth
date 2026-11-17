// Drawn maps of each session's big ideas, keyed by session number. Students open them from their lesson.
import type { ReactNode } from "react";

type Map = { title: string; body: ReactNode };

function Fig({ n, title, refs, take, children }: { n: number; title: string; refs: string; take?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel lm-fig">
      <div className="lm-head"><span className="lm-n">{n}</span><div><h2>{title}</h2><p className="muted small">{refs}</p></div></div>
      {children}
      {take && <p className="lm-take">{take}</p>}
    </section>
  );
}
const Down = ({ children }: { children?: ReactNode }) => <div className="lm-down">{children}</div>;
const Box = ({ k = "", tag, title, children }: { k?: string; tag?: string; title?: string; children?: ReactNode }) =>
  <div className={`lm-box ${k}`}>{tag && <span className="lm-tag">{tag}</span>}{title && <b>{title}</b>}{children && <span>{children}</span>}</div>;

const MAPS: Record<number, Map> = {
  1: {
    title: "The Reason for Creation",
    body: (
      <>
        <Fig n={1} title="How do we know why God created?" refs="1 Corinthians 2" take="We know why God created only because He has told us.">
          <div className="lm-two">
            <Box k="dim" tag="Sense knowledge" title="What my senses tell me">Sight, hearing, touch, taste and smell show me the world, but not why it is here.</Box>
            <Box k="go" tag="Revelation knowledge" title="What God has told me">God put His thoughts into words in the Bible. That is how we know His reason.</Box>
          </div>
        </Fig>
        <Fig n={2} title="Everything was made for something" refs="Genesis 1:14–19 · Ephesians 1:4–5" take="Love was the reason (a Love God). He spoke and it was (a Faith God).">
          <div className="lm-col">
            <Box title="Sun, moon and stars">for signs, seasons, days and years</Box>
            <Down>serve</Down>
            <Box title="The earth">prepared and called good, ready to live in</Box>
            <Down>was made as a home for</Down>
            <Box k="man" title="Man">the reason for the earth</Box>
            <Down>was made because of</Down>
            <Box k="god" title="The Father-heart of God">He wanted sons and daughters to share His life</Box>
          </div>
        </Fig>
        <Fig n={3} title="Man is spirit, soul and body" refs="1 Thessalonians 5:23 · Genesis 2:7" take="Made in God's image, so we can know Him as Father and be His children, not just creatures.">
          <svg className="lm-rings" viewBox="0 0 260 260" role="img" aria-label="Three circles, one inside the other: body on the outside, soul in the middle, spirit at the centre">
            <circle cx="130" cy="130" r="124" className="r-body" />
            <circle cx="130" cy="142" r="84" className="r-soul" />
            <circle cx="130" cy="156" r="44" className="r-spirit" />
            <text x="130" y="36" className="t-body">BODY</text>
            <text x="130" y="88" className="t-soul">SOUL</text>
            <text x="130" y="162" className="t-spirit">SPIRIT</text>
          </svg>
          <ul className="lm-key">
            <li><i className="r-spirit" /><div><b>Spirit</b> The real me, made to share God's life and walk with Him.</div></li>
            <li><i className="r-soul" /><div><b>Soul</b> My mind and feelings. God also gave man a <strong>will</strong>, the power to choose, so his love for God could be real.</div></li>
            <li><i className="r-body" /><div><b>Body</b> How I touch the world through my five senses. Adam's body was perfect.</div></li>
          </ul>
        </Fig>
        <Fig n={4} title="God's under-ruler" refs="Genesis 1:28 · Psalm 8:3–6" take="See how high man stood, and you will see how far he fell in Session 2.">
          <div className="lm-col">
            <Box k="god" title="God">the Creator and Father</Box>
            <Down>gave dominion to</Down>
            <Box k="man" title="Adam">"a little lower than God" (Psalm 8:5): His companion and under-ruler</Box>
            <Down>ruled over</Down>
            <Box title="All creation">fish, birds, cattle and every living thing</Box>
          </div>
        </Fig>
      </>
    ),
  },
  2: {
    title: "Man's Treason and Its Results",
    body: (
      <>
        <Fig n={1} title="Deceived, or a choice?" refs="Genesis 3:1–6 · 1 Timothy 2:13–14" take={<>Adam's sin was <strong>High Treason</strong>: he turned his authority over to God's enemy.</>}>
          <div className="lm-two">
            <Box k="dim" tag="Eve" title="Was deceived">The serpent tricked her into believing God's word was not true.</Box>
            <Box k="bad" tag="Adam" title="Was not deceived">He knew what he was doing and chose it anyway. There was no law yet, so this was not breaking a rule.</Box>
          </div>
        </Fig>
        <Fig n={2} title="Where Satan's authority came from" refs="Luke 4:5–8" take="Satan's authority is real, but it is borrowed. It came from Adam. Satan is not equal to God.">
          <div className="lm-col">
            <Box k="god" title="God">gave the authority</Box>
            <Down>dominion given</Down>
            <Box k="man" title="Adam">held it for God</Box>
            <Down>handed over</Down>
            <Box k="bad" title="Satan">"that is delivered unto me"</Box>
          </div>
          <p>When Satan showed Jesus the kingdoms of the world, he said they had been delivered to him. Jesus did not argue with that. He beat Satan with the Word (Luke 4:8).</p>
        </Fig>
        <Fig n={3} title="Before and after the treason" refs="Genesis 1:28 · Ephesians 2:1–3">
          <div className="lm-two">
            <div className="lm-col lm-side">
              <span className="lm-tag">Before</span>
              <Box k="god" title="God">Father</Box>
              <Down>life and fellowship</Down>
              <Box k="man" title="Adam">under-ruler</Box>
              <Down>rules</Down>
              <Box title="Creation" />
            </div>
            <div className="lm-col lm-side">
              <span className="lm-tag">After</span>
              <Box k="god" title="God">Father</Box>
              <div className="lm-cut">✕ separated from God</div>
              <Box k="bad" title="Satan">"prince of the power of the air"</Box>
              <Down>rules over</Down>
              <Box k="dim" title="Man and creation">"by nature children of wrath"</Box>
            </div>
          </div>
        </Fig>
        <Fig n={4} title="What is Spiritual Death?" refs="Genesis 5:5 · Revelation 20:14" take="Adam's death was two-fold: first in spirit, then in body.">
          <p>Spiritual Death is being <strong>separated from God</strong>, and it is a <strong>nature</strong>: man now has Satan's nature and lives without God's life. It does not mean he stops existing.</p>
          <ol className="lm-time">
            <li><span>The same day</span><b>Spiritual death</b>Adam died in his spirit the moment he sinned.</li>
            <li><span>930 years later</span><b>Physical death</b>His body died, the fruit of the spiritual death.</li>
            <li><span>The end</span><b>The second death</b>Final, forever separation from God.</li>
          </ol>
        </Fig>
        <Fig n={5} title="How it reached all of us" refs="Romans 5:12 · Romans 5:17–19">
          <div className="lm-flow"><b className="man">One man</b>→<b>sin entered</b>→<b className="bad">death</b>→<b className="god">all men</b></div>
          <p>Adam was the head of the human race, so everyone born after him shares his condition. We were born into it, not only guilty of things we did.</p>
        </Fig>
        <Fig n={6} title="Two natures, two kinds of fruit" refs="John 8:44" take="If the problem is a nature, man needs more than trying harder. He needs a new nature from God.">
          <div className="lm-two">
            <Box k="go" tag="God's nature"><ul><li>Love</li><li>Joy</li><li>Peace</li><li>Goodness</li></ul></Box>
            <Box k="bad" tag="Satan's nature"><ul><li>Hatred</li><li>Lust</li><li>Murder</li><li>Every kind of evil</li></ul></Box>
          </div>
        </Fig>
      </>
    ),
  },
};

export const hasMap = (session: number | null) => !!session && session in MAPS;

export function LessonMap({ session }: { session: number }) {
  const earlier = Object.keys(MAPS).map(Number).filter(n => n < session).reverse();
  return (
    <>
      {MAPS[session]?.body}
      {earlier.map(n => (
        <details key={n} className="panel lm-back">
          <summary><b>Look back: Session {n}</b> · {MAPS[n].title}</summary>
          <div className="lm-backbody">{MAPS[n].body}</div>
        </details>
      ))}
    </>
  );
}
