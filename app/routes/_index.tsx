import type { Route } from "./+types/_index";
import { Form } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  return { ok: true };
}

export default function Index() {
  return (
    <main style={{fontFamily:"Arial,sans-serif",padding:40}}>
      <h1>Sakhi Seva Order Desk</h1>
      <p>This app is intended to be opened through the Shopify storefront app proxy.</p>
      <p>Storefront path: <code>/apps/sakhi-order-desk</code></p>
    </main>
  );
}