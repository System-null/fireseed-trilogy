import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Fireseed Web</h1>
      <p>Explore Fireseed capsules and verify proofs.</p>
      <ul>
        <li>
          <Link href="/capsule">Capsule viewer</Link>
        </li>
        <li>
          <Link href="/verify/demo">Verify a CID</Link>
        </li>
      </ul>
    </main>
  );
}
