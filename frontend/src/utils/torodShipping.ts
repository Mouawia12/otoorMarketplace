type TorodPartner = Record<string, unknown> & {
  id?: string | number;
  currency?: string | null;
};

type TorodGroup = {
  group_key?: string | number;
  partners?: TorodPartner[];
};

type TorodSelections = Record<string, string>;

type TorodShippingInput = {
  groups: TorodGroup[];
  groupSelections: TorodSelections;
  commonPartnerId?: string;
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const resolvePartnerPrice = (partner: TorodPartner): number | undefined => {
  const priceKeys = ["rate", "price", "total_amount", "amount"];
  for (const key of priceKeys) {
    if (key in partner) {
      const value = toNumber(partner[key]);
      if (value !== undefined) return value;
    }
  }
  return undefined;
};

export const computeTorodShippingTotal = ({
  groups,
  groupSelections,
  commonPartnerId,
}: TorodShippingInput): { total: number; currency?: string } => {
  let total = 0;
  let currency: string | undefined;
  const commonId = commonPartnerId ? String(commonPartnerId) : "";

  groups.forEach((group) => {
    const partners = Array.isArray(group?.partners) ? group.partners : [];
    const groupKey = group?.group_key !== undefined ? String(group.group_key) : "";
    if (!groupKey || partners.length === 0) return;

    let selectedId = "";
    if (commonId) {
      const hasCommon = partners.some((partner) => String(partner?.id ?? "") === commonId);
      if (hasCommon) selectedId = commonId;
    }

    if (!selectedId) {
      const groupSelected = groupSelections[groupKey];
      if (groupSelected) selectedId = String(groupSelected);
    }

    if (!selectedId) return;

    const partner = partners.find((entry) => String(entry?.id ?? "") === selectedId);
    if (!partner) return;

    const price = resolvePartnerPrice(partner);
    if (price === undefined) {
      console.warn("Torod partner price missing", {
        partnerId: partner?.id,
        keys: Object.keys(partner ?? {}),
        partner,
      });
      return;
    }

    total += price;
    if (!currency && typeof partner.currency === "string" && partner.currency.trim()) {
      currency = partner.currency.trim();
    }
  });

  return { total, currency };
};
