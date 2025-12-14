import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function SellerProfileComplete() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: "",
    city: "",
    address: "",
    national_id: "",
    iban: "",
    bank_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // load existing profile if any
    const loadProfile = async () => {
      try {
        const res = await api.get("/seller/profile/me");
        if (res.data?.profile) {
          setForm({
            full_name: res.data.profile.full_name || form.full_name,
            phone: res.data.profile.phone || "",
            city: res.data.profile.city || "",
            address: res.data.profile.address || "",
            national_id: res.data.profile.national_id || "",
            iban: res.data.profile.iban || "",
            bank_name: res.data.profile.bank_name || "",
          });
        }
      } catch (_error) {
        // ignore if none
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalizedValue = name === "iban" ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const requiredFields = ["full_name", "phone", "city", "address", "national_id", "iban", "bank_name"] as const;
    const missing = requiredFields.filter((k) => !form[k as keyof typeof form]?.toString().trim());
    if (missing.length > 0) {
      setError(t("support.fillAllFields"));
      return;
    }

    if (form.phone.trim().length < 8) {
      setError(t("seller.phoneValidation", "رقم الهاتف يجب أن يكون 8 أرقام أو أكثر"));
      return;
    }
    if (form.national_id.trim().length < 8) {
      setError(t("seller.nationalIdValidation", "رقم الهوية يجب أن يكون 8 أرقام أو أكثر"));
      return;
    }
    if (form.iban.trim().length < 10) {
      setError(t("seller.ibanValidation", "رقم الآيبان يجب أن يكون 10 أرقام أو أكثر"));
      return;
    }
    if (!form.iban.trim().toUpperCase().startsWith("SA")) {
      setError(t("seller.ibanPrefixValidation", "يجب أن يبدأ رقم الآيبان بالحرفين SA"));
      return;
    }

    try {
      setLoading(true);
      await api.post("/seller/profile/me", form);
      await fetchUser();
      setMessage(t("seller.profileSubmitted", "تم إرسال طلبك للمراجعة"));
      navigate("/seller/profile-status", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-4">
        {t("seller.completeProfile", "أكمل ملف البائع")}
      </h1>
      <p className="text-taupe mb-6">{t("seller.profileHint", "أكمل البيانات للمراجعة والموافقة.")}</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("account.fullName")}</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("account.phone", "رقم الهاتف")}</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("seller.city", "المدينة")}</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("seller.address", "العنوان")}</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("seller.nationalId", "الهوية/الإقامة")}</label>
            <input
              name="national_id"
              value={form.national_id}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("seller.bankName", "البنك")}</label>
            <input
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-charcoal mb-1">{t("seller.iban", "رقم الآيبان")}</label>
            <input
              name="iban"
              value={form.iban}
              onChange={handleChange}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
        </div>

        {message && <p className="text-sm font-semibold text-success">{message}</p>}
        {error && <p className="text-sm font-semibold text-alert">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gold text-charcoal rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-60"
        >
          {loading ? t("common.loading") : t("common.submit", "إرسال")}
        </button>
      </form>
    </div>
  );
}
