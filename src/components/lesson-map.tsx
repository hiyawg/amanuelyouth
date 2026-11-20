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
          <p>Spiritual Death is being <strong>separated from God</strong>. Man's <strong>nature</strong> became fallen and sinful, and he lives without God's life, under Satan's rule but not one with him. It does not mean he stops existing.</p>
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
        <Fig n={6} title="Two kinds of fruit" refs="Galatians 5:19–23" take="If the problem is a fallen nature, man needs more than trying harder. He needs a new nature from God.">
          <div className="lm-two">
            <Box k="go" tag="God's life"><ul><li>Love</li><li>Joy</li><li>Peace</li><li>Goodness</li></ul></Box>
            <Box k="bad" tag="The fallen nature"><ul><li>Hatred</li><li>Lust</li><li>Murder</li><li>Every kind of evil</li></ul></Box>
          </div>
        </Fig>
      </>
    ),
  },
  3: {
    title: "The Reign of Spiritual Death",
    body: (
      <>
        <Fig n={1} title="Death reigns" refs="Romans 5:12–21 · Ephesians 2:1–3" take="Spiritual Death is not only something that happened to Adam. It rules the whole race.">
          <div className="lm-flow"><b className="man">Adam</b>→<b className="bad">Spiritual Death</b>→<b>the whole race</b></div>
          <p>Every person is born under the rule of sin and of Satan, "by nature the children of wrath" (Ephesians 2:3). Man is not one with Satan, but he lives under his rule.</p>
        </Fig>
        <Fig n={2} title="Three wills, two masters" refs="Matthew 6:24" take="Man's will was never meant to stand alone. It yields to God or to Satan.">
          <div className="lm-col">
            <div className="lm-two">
              <Box k="god" title="God's will" />
              <Box k="bad" title="Satan's will" />
            </div>
            <Down>man must yield to one</Down>
            <Box k="man" title="Man's will">the power to choose. In the fall, Adam turned from God's will and came under Satan's.</Box>
          </div>
        </Fig>
        <Fig n={3} title="Why man was driven out" refs="Genesis 3:22–24" take="The flaming sword was judgment, and mercy too. It kept the way open for redemption.">
          <div className="lm-col">
            <Box k="dim" title="Fallen man">separated from God</Box>
            <div className="lm-cut">✕ the way is guarded</div>
            <Box k="go" title="The tree of life">had he eaten, he would have lived for ever in his fallen state</Box>
          </div>
        </Fig>
        <Fig n={4} title="It showed at once" refs="Genesis 4:8–9 · John 8:44 · 1 John 3:12" take="In the very next generation, murder and lies appeared in man.">
          <div className="lm-two">
            <Box k="bad" tag="Cain" title="Murdered">He killed his brother Abel.</Box>
            <Box k="bad" tag="Cain" title="Lied">"Am I my brother's keeper?"</Box>
          </div>
        </Fig>
        <Fig n={5} title="From faith to reason" refs="2 Corinthians 5:7" take="Sense knowledge became man's highest authority.">
          <div className="lm-two">
            <Box k="go" tag="Before the fall" title="Walked by faith">Adam walked with God and trusted His word.</Box>
            <Box k="dim" tag="After the fall" title="Ruled by reason">Cut off from God, man trusted only what his senses told him.</Box>
          </div>
        </Fig>
        <Fig n={6} title="What can't fix it, and what can" refs="Romans 5:17 · Romans 8:11" take="Forgiveness deals with what man has done. Man needs a change in what he is.">
          <div className="lm-two">
            <Box k="dim" tag="Cannot break it"><ul><li>Education</li><li>Progress and civilization</li><li>Trying harder</li><li>Forgiveness alone</li></ul></Box>
            <Box k="go" tag="God's answer" title="Eternal Life">God's own life and nature. It replaces Spiritual Death, restores fellowship, and reaches even the body.</Box>
          </div>
          <p>Man is under Satan's dominion and cannot free himself. Only One greater than Satan can redeem him: <strong>God Himself must redeem</strong>.</p>
        </Fig>
      </>
    ),
  },
  4: {
    title: "Man's Need of Righteousness",
    body: (
      <>
        <Fig n={1} title="Is God unfair?" refs="Romans 3:23–26" take="God is not unjust. He did not leave man in his condition; He provided a Redemption.">
          <div className="lm-two">
            <Box k="dim" tag="The charge" title="“It's God's fault”">Men blame God for sin, sickness and death in the world.</Box>
            <Box k="go" tag="The answer" title="Adam chose">God planned joy and peace. Adam had a will and chose his own way, and God then made a way back.</Box>
          </div>
        </Fig>
        <Fig n={2} title="Three things justice needed" refs="Romans 3:26" take={<>"That he might be <strong>just</strong>, and the <strong>justifier</strong> of him which believeth in Jesus."</>}>
          <ol className="lm-time">
            <li><span>Toward man</span><b>The sin can't be overlooked</b>The penalty must really be paid.</li>
            <li><span>Toward Satan</span><b>His authority taken lawfully</b>It came through Adam, so it must be won back by right, not just by force.</li>
            <li><span>Toward Himself</span><b>True to His own righteousness</b>Whatever God does must be right by His own standard.</li>
          </ol>
        </Fig>
        <Fig n={3} title="What Redemption must do" refs="Romans 5:17–19 · 2 Corinthians 5:17">
          <ol className="lm-time">
            <li><span>1</span><b>Pay the penalty</b>and free man from Satan's rule</li>
            <li><span>2</span><b>Give man authority</b>to stand against Satan</li>
            <li><span>3</span><b>Raise the body</b>resurrection and immortality</li>
            <li><span>4</span><b>Restore the earth</b>to its first glory</li>
            <li><span>5</span><b>Make a New Creation</b>with God's nature, righteousness and fellowship</li>
          </ol>
        </Fig>
        <Fig n={4} title="Who could redeem?" refs="Romans 3:10 · Isaiah 59:16" take="No man could pay for himself, let alone for anyone else. God had to provide the Redeemer.">
          <div className="lm-col">
            <Box k="dim" title="Every man">under Spiritual Death. "There is none righteous, no, not one."</Box>
            <div className="lm-cut">✕ cannot redeem</div>
            <Box k="god" title="God">"His arm brought salvation"</Box>
          </div>
        </Fig>
        <Fig n={5} title="The Redeemer must be…" refs="Romans 5:18–19 · 2 Corinthians 5:21" take="Only the union of God and man, the Incarnation of God's Son, meets every one.">
          <ul className="lm-key">
            <li><i className="r-body" /><div><b>A man</b> because man sinned</div></li>
            <li><i className="r-soul" /><div><b>Not born by natural generation</b> so he is free from Spiritual Death</div></li>
            <li><i className="r-spirit" /><div><b>Sinless</b> able to live without sin, pay the penalty and conquer Satan</div></li>
          </ul>
          <div className="lm-flow"><b className="man">Adam</b>→<b className="bad">judgment on all</b></div>
          <div className="lm-flow"><b className="god">Jesus</b>→<b className="go">righteousness for all who believe</b></div>
        </Fig>
      </>
    ),
  },
  5: {
    title: "Man's Need of a Mediator",
    body: (
      <>
        <Fig n={1} title="Man's three needs" refs="Sessions 3, 4 and 5" take="This session takes up the third need.">
          <ol className="lm-time">
            <li><span>Session 3</span><b>Eternal Life</b>God's own nature</li>
            <li><span>Session 4</span><b>Righteousness</b>right standing with God</li>
            <li><span>Session 5</span><b>A Mediator</b>someone to stand between God and man</li>
          </ol>
        </Fig>
        <Fig n={2} title="Man has no standing" refs="Romans 3:9–18 · 2 Corinthians 4:4" take="The temples, altars and priests of every nation say the same thing: we need someone to stand between.">
          <div className="lm-col">
            <Box k="god" title="God">holy and righteous</Box>
            <div className="lm-cut">✕ no way in</div>
            <Box k="dim" title="Fallen man">a subject of Satan, his mind darkened, "none that seeketh after God"</Box>
          </div>
        </Fig>
        <Fig n={3} title="The way God gave" refs="Genesis 3:21" take="From the beginning, man came to God only over a sacrifice or through a priest.">
          <div className="lm-flow"><b className="man">Man</b>→<b className="bad">a sacrifice</b>→<b className="god">God</b></div>
          <p>God clothed Adam and Eve with coats of skins. Something had to die for them to be covered.</p>
        </Fig>
        <Fig n={4} title="No one comes uninvited" refs="Leviticus 10:1–3 · Numbers 16 · 1 Samuel 6:19">
          <ul className="lm-key">
            <li><i className="r-body" /><div><b>Nadab and Abihu</b> offered "strange fire", worship their own way, and were consumed.</div></li>
            <li><i className="r-soul" /><div><b>Korah</b> rebelled against the leaders God chose, and the earth swallowed the rebels.</div></li>
            <li><i className="r-spirit" /><div><b>Beth-shemesh</b> looked into the ark of God and were struck.</div></li>
          </ul>
        </Fig>
        <Fig n={5} title="Job's cry for a daysman" refs="Job 9:32–33 · Jeremiah 30:21" take="Job needed an umpire who could lay one hand on God and one on man.">
          <div className="lm-col">
            <Box k="god" title="God" />
            <Down>one hand on God</Down>
            <Box k="go" title="The daysman">"Neither is there any daysman betwixt us"</Box>
            <Down>one hand on man</Down>
            <Box k="man" title="Man" />
          </div>
        </Fig>
        <Fig n={6} title="The Mediator must be…" refs="1 Timothy 2:5 · Hebrews 4:15" take={<>"One mediator between God and men, <strong>the man Christ Jesus</strong>."</>}>
          <ol className="lm-time">
            <li><span>1</span><b>A man</b>to represent humanity</li>
            <li><span>2</span><b>Tempted like us</b>so he understands and sympathizes</li>
            <li><span>3</span><b>Righteous before God</b>with a standing in His presence</li>
            <li><span>4</span><b>Not under Satan's authority</b>free from his rule</li>
          </ol>
        </Fig>
      </>
    ),
  },
  21: {
    title: "The Spirit Who Comes to Dwell",
    body: (
      <>
        <Fig n={1} title="A Person, not a power" refs="John 14:16–17 · John 16:13–14" take="You can't grieve electricity. The Holy Spirit is Someone to know, not something to use.">
          <div className="lm-two">
            <Box k="go" tag="What He does" title="Only a person can"><ul><li>Guides into truth</li><li>Hears, then speaks</li><li>Shows things to come</li><li>Glorifies Christ</li></ul></Box>
            <Box k="bad" tag="What can be done to Him" title="Only to a person"><ul><li>Lied to (Acts 5:3)</li><li>Grieved (Ephesians 4:30)</li><li>Quenched (1 Thess 5:19)</li><li>Resisted (Acts 7:51)</li></ul></Box>
          </div>
          <p>Scripture shows one God. Father, Son and Spirit are not three gods.</p>
        </Fig>
        <Fig n={2} title="Another Comforter" refs="John 14:16" take="“Another” means another of the same kind: not a lesser stand-in for Jesus.">
          <div className="lm-flow"><b className="god">Jesus with them</b>→<b className="go">the Spirit in them</b></div>
        </Fig>
        <Fig n={3} title="The test" refs="Romans 8:9" take="Everyone who belongs to Christ has the Spirit. This rests on God's promise, not on a feeling.">
          <div className="lm-col">
            <Box k="man" title="Belongs to Christ" />
            <Down>always has</Down>
            <Box k="go" title="The Spirit within">"If any man have not the Spirit of Christ, he is none of his."</Box>
          </div>
        </Fig>
        <Fig n={4} title="Three pictures" refs="1 Corinthians 6:19 · Ephesians 1:13–14">
          <ul className="lm-key">
            <li><i className="r-spirit" /><div><b>Temple</b> Your body is where He lives, so "ye are not your own". He <strong>owns</strong>.</div></li>
            <li><i className="r-soul" /><div><b>Seal</b> God's mark that you are His, and will arrive safe. He <strong>guarantees</strong>.</div></li>
            <li><i className="r-body" /><div><b>Earnest</b> A down payment: real now, with more to come. He <strong>gives a foretaste</strong>.</div></li>
          </ul>
        </Fig>
      </>
    ),
  },
  22: {
    title: "Upon and Within",
    body: (
      <>
        <Fig n={1} title="In the Old Testament: upon, for a task" refs="Judges 6:34 · 1 Samuel 16:13–14 · Psalm 51:11" take="The Spirit came upon chosen people for a job, and He could leave.">
          <ul className="lm-key">
            <li><i className="r-spirit" /><div><b>Gideon</b> to rally Israel</div></li>
            <li><i className="r-soul" /><div><b>David</b> at his anointing as king</div></li>
            <li><i className="r-body" /><div><b>Saul</b> "the Spirit of the LORD departed", which is why David prayed, "take not thy holy spirit from me"</div></li>
          </ul>
        </Fig>
        <Fig n={2} title="The sentence that changes everything" refs="John 14:17" take="The whole session turns on two small words.">
          <div className="lm-two">
            <Box k="dim" tag="Before" title="WITH you">"He dwelleth with you": alongside them, as He had always worked.</Box>
            <Box k="go" tag="Promised" title="IN you">"…and shall be in you": living inside every believer.</Box>
          </div>
        </Fig>
        <Fig n={3} title="Then “upon” comes back" refs="Luke 24:49 · Acts 1:8 · Acts 2:1–4" take="The power is for being a witness for Jesus.">
          <div className="lm-flow"><b className="go">The Spirit upon you</b>→<b>power</b>→<b className="man">witnesses</b>→<b className="god">to the ends of the earth</b></div>
        </Fig>
        <Fig n={4} title="Two pictures, not two kinds of Christian" refs="Romans 8:9 · 1 Corinthians 12:13 · Ephesians 5:18" take="Every believer has the Spirit within. No one is a second-class Christian.">
          <div className="lm-two">
            <Box k="go" tag="Within" title="Life">Every believer, from the new birth</Box>
            <Box k="man" tag="Upon" title="Power for service">To be useful, not more important</Box>
          </div>
          <p>"Be filled with the Spirit" means <strong>keep on being filled</strong>. Christians differ on how the baptism in the Holy Spirit relates to being saved. Your teacher will explain both views fairly, and where our church stands.</p>
        </Fig>
      </>
    ),
  },
  23: {
    title: "Speaking with Tongues, and the Gifts in the Assembly",
    body: (
      <>
        <Fig n={1} title="Tongues in Acts" refs="Acts 2 · Acts 10:44–46 · Acts 19:6" take="In Acts 10, tongues proved what words alone had not: God had given the Spirit to the Gentiles too.">
          <ol className="lm-time">
            <li><span>Acts 2</span><b>Pentecost</b>in Jerusalem</li>
            <li><span>Acts 10</span><b>Cornelius' house</b>the first Gentiles</li>
            <li><span>Acts 19</span><b>Ephesus</b>disciples Paul laid hands on</li>
          </ol>
        </Fig>
        <Fig n={2} title="Who decides the gifts?" refs="1 Corinthians 12:7, 11" take="The Spirit gives each gift as He chooses. Gifts are not earned and don't give anyone rank.">
          <div className="lm-col">
            <Box k="go" title="The Holy Spirit">"dividing to every man severally as he will"</Box>
            <Down>gives gifts</Down>
            <Box k="man" title="To each believer">"to profit withal", for the good of everyone</Box>
          </div>
        </Fig>
        <Fig n={3} title="Who it builds up" refs="1 Corinthians 14:4–5">
          <div className="lm-two">
            <Box k="man" tag="A tongue" title="Builds up the speaker">In church it needs interpretation, so everyone can be built up.</Box>
            <Box k="go" tag="Prophecy" title="Builds up the church">Everyone understands it.</Box>
          </div>
        </Fig>
        <Fig n={4} title="Love sits in the middle" refs="1 Corinthians 12–14" take="Without love, the most impressive gift is nothing.">
          <div className="lm-flow"><b>Ch 12 · the gifts</b>→<b className="god">Ch 13 · love</b>→<b>Ch 14 · order</b></div>
          <p>The Corinthians were the most gifted church in the New Testament, and Paul called them carnal (1 Corinthians 3:1–3). A gift is not a badge of maturity.</p>
        </Fig>
        <Fig n={5} title="Both halves of the command" refs="1 Corinthians 14:39–40" take="A church with disorderly gifts got rules, not a ban.">
          <div className="lm-two">
            <Box k="go" title="“Covet to prophesy”">Pursue it eagerly.</Box>
            <Box k="go" title="“Forbid not to speak with tongues”">Don't stop it.</Box>
          </div>
          <p><strong>In order:</strong> two or at most three, one at a time, with interpretation. "Let all things be done decently and in order." No one will ever be pressured here.</p>
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
