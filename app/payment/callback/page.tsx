import { PaymentCallbackClient } from "./PaymentCallbackClient";

export const metadata = { title: "Payment Status" };

export default async function PaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const params = await searchParams;
  return <PaymentCallbackClient reference={params.reference || params.trxref || ""} />;
}
