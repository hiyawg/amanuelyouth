// The class agreement parents sign: the letter, and a signed copy for parents and teachers to view or print.
import type { Consent } from "@/lib/shared";

export const CONSENT_TITLE = "Parent/Guardian Acknowledgment & Commitment Form";

const EXPECTATIONS: [string, string][] = [
  ["Bring a Bible", "Each student must bring a Bible to every session and actively participate in studying God's Word."],
  ["Respect God's Word", "Students must pay attention during teaching, Scripture reading, prayer, and discussions."],
  ["No mocking or ridicule", "Making fun of others, mocking spiritual activities, or laughing at someone who is praying, reading, or participating is unacceptable."],
  ["No disruptive behavior", "Unnecessary laughter, side conversations, shouting, playing around, and other distractions during sessions are not permitted."],
  ["Respect leaders and fellow students", "Every student must demonstrate respect, kindness, and consideration toward teachers, leaders, and classmates."],
  ["Participate sincerely", "Students are encouraged to ask questions, contribute to discussions, pray, and participate with a willingness to learn."],
  ["Be considerate of others", "Students must understand that their behavior affects the spiritual learning and concentration of everyone around them."],
  ["Accept correction", "Students are expected to receive guidance and correction from leaders with humility and a willingness to improve."],
  ["Maintain a healthy environment", "Every student shares responsibility for making the class a place where others can learn, pray, and grow in Christ."],
  ["Represent Christ", "Students are expected to demonstrate Christian values and behavior both inside and outside the classroom."],
];
const SCRIPTURES: [string, string][] = [
  ["Psalm 1:1–3", "We must not adopt the attitude of mockers, but delight in God's Word."],
  ["Matthew 21:12–13", "Jesus demonstrated the importance of honoring the purpose and holiness of God's house."],
  ["Philippians 2:5", "We are called to have the mind and attitude of Christ."],
  ["Romans 14:19", "We should pursue what builds others up."],
];
const PARENTS = [
  "Discuss these expectations with their children.",
  "Encourage regular Bible reading and spiritual growth at home.",
  "Reinforce the importance of respect, discipline, and godly behavior.",
  "Support the leadership team when guidance or correction is necessary.",
  "Communicate respectfully with ministry leaders if concerns arise.",
];

/** The letter itself, up to the acknowledgment the parent signs. */
export function ConsentLetter() {
  return (
    <div className="consent">
      <header className="consent-head">
        <span className="eyebrow">Amanuel Youth Discipleship Class</span>
        <h1>{CONSENT_TITLE}</h1>
      </header>
      <p>Dear Parents and Guardians,</p>
      <p>We are grateful for the opportunity to partner with you in the spiritual growth and development of your children.</p>
      <p>The purpose of our Discipleship Class is not simply to teach biblical knowledge, but to help young people become genuine followers of Jesus Christ, developing godly character, spiritual discipline, respect for God's Word, and Christlike attitudes.</p>
      <p>As we pursue this goal, we believe that maintaining a respectful, focused, and spiritually healthy learning environment is essential. We ask parents and guardians to review the following class expectations with their children and support the leadership team in upholding them.</p>
      <h2>1. Discipleship Class Expectations</h2>
      <p>Every student is expected to:</p>
      <ul className="consent-list">{EXPECTATIONS.map(([b, t]) => <li key={b}><b>{b}:</b> {t}</li>)}</ul>
      <h2>2. Biblical Foundation</h2>
      <p>Our expectations are founded on the following Scriptures:</p>
      <ul className="consent-list">{SCRIPTURES.map(([b, t]) => <li key={b}><b>{b}:</b> {t}</li>)}</ul>
      <h2>3. Parental Partnership</h2>
      <p>We recognize that discipleship is a partnership between the church, parents, and students. We kindly ask parents and guardians to:</p>
      <ul className="consent-list">{PARENTS.map(t => <li key={t}>{t}</li>)}</ul>
      <h2>4. Correction and Accountability</h2>
      <p>Our intention is never to discourage or embarrass a student. However, repeated disruptive or disrespectful behavior will be addressed by the leadership team.</p>
      <p>Depending on the situation, leaders may speak privately with the student, communicate with parents or guardians, and establish appropriate steps for improvement.</p>
      <p>Our goal is always restoration, spiritual maturity, and the development of Christlike character.</p>
      <h2>5. Parent/Guardian Acknowledgment</h2>
      <p>I acknowledge that I have read and understood the Amanuel Youth Discipleship Class expectations and regulations.</p>
      <p>I agree to discuss these expectations with my child and encourage him/her to respect the class guidelines.</p>
      <p>I understand that discipleship involves learning, obedience, accountability, and the development of Christlike character. I will support the ministry leadership in providing a healthy and respectful environment for all students.</p>
    </div>
  );
}

export const CONSENT_CLOSING = "Our shared commitment: To raise young people who do not merely know about Jesus, but genuinely follow Him, reflect His character, and honor His Word.";

/** The filled-in signature block of a signed form. */
export function SignedBlock({ c }: { c: Pick<Consent, "student_name" | "parent_name" | "parent_phone" | "signature" | "signed_on"> }) {
  const date = new Date(c.signed_on + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <dl className="signed">
      <div><dt>Student's full name</dt><dd>{c.student_name}</dd></div>
      <div><dt>Parent/Guardian full name</dt><dd>{c.parent_name}</dd></div>
      <div className="sig"><dt>Parent/Guardian signature</dt><dd>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.signature} alt={`Signature of ${c.parent_name}`} /></dd></div>
      <div><dt>Date</dt><dd>{date}</dd></div>
      <div><dt>Parent/Guardian contact number</dt><dd>{c.parent_phone || "–"}</dd></div>
    </dl>
  );
}

export function ConsentFooter() {
  return <p className="consent-close"><em>{CONSENT_CLOSING}</em><br /><b>Amanuel Youth Discipleship Ministry</b></p>;
}
