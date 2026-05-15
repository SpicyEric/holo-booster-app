import SalesRepMessages from "./SalesRepMessages";
import SalesRepOrders from "./SalesRepOrders";

export default function SalesRepInbox() {
  return (
    <div className="space-y-10">
      <section>
        <SalesRepMessages />
      </section>
      <div className="border-t border-border/60" />
      <section>
        <SalesRepOrders />
      </section>
    </div>
  );
}
