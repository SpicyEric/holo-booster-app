import SalesRepAbrechnungen from "./SalesRepAbrechnungen";
import SalesRepMeinVertrag from "./SalesRepMeinVertrag";

export default function SalesRepVertragAbrechnung() {
  return (
    <div className="space-y-10">
      <section>
        <SalesRepAbrechnungen />
      </section>
      <div className="border-t border-border/60" />
      <section>
        <SalesRepMeinVertrag />
      </section>
    </div>
  );
}
