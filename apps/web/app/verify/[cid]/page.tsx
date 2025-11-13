import type { Metadata } from 'next';

interface VerifyPageProps {
  params: {
    cid: string;
  };
}

export function generateMetadata({ params }: VerifyPageProps): Metadata {
  return {
    title: `Verify ${params.cid}`
  };
}

export default function VerifyPage({ params }: VerifyPageProps) {
  return (
    <main>
      <h1>Verify CID</h1>
      <p>
        Verifying <code>{params.cid}</code>.
      </p>
      <p>
        Provide this CID to the Fireseed CLI or API to fetch the associated capsule and verify its
        provenance.
      </p>
    </main>
  );
}
