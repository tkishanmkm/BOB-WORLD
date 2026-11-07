"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INITIAL_ACCOUNT_DETAILS,
  ACCOUNT_DETAILS_STORAGE_KEY,
  LOGIN_BANNER_KEY_1,
  LOGIN_BANNER_KEY_2,
  LOGIN_BANNER_KEY_3,
  LOGIN_BANNER_KEY_4,
  LOGIN_BANNER_KEY_5,
} from "@/lib/constants";
import type { AccountDetailsType } from "@/lib/types";
import {
  ChevronDown,
  ChevronUp,
  Lock,
  QrCode,
  Eye,
  MoreHorizontal,
  Smartphone,
  CreditCard,
  Send,
  HelpCircle,
  ScanFace,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, persistStorageKeys } from "@/lib/indexed-db";

const PinInputCircle: React.FC<{ value: string }> = ({ value }) => (
  <span
    aria-hidden="true"
    className={cn(
      "block h-[14px] w-[14px] rounded-full border-[2px] border-[#244d78] transition-colors",
      value ? "bg-[#244d78]" : "bg-white"
    )}
  />
);

type LoginActionProps = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
};

function LoginAction({ icon: Icon, label, onClick }: LoginActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-[#244d78]"
    >
      <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-white shadow-[0_4px_18px_rgba(24,48,75,0.10)]">
        <Icon className="h-7 w-7 stroke-[2.2]" />
      </span>
      <span className="max-w-[100px] text-[13px] font-semibold leading-[1.2]">{label}</span>
    </button>
  );
}

function FooterAction({ icon: Icon, label, onClick }: LoginActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center justify-start gap-2 px-1 text-center text-[#244d78]"
    >
      <Icon className="h-8 w-8 stroke-[2]" />
      <span className="text-[12px] font-semibold leading-tight">{label}</span>
    </button>
  );
}

export default function LoginPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loginBanners, setLoginBanners] = useState<string[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
      if (cancelled) return;
      const storedDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      if (storedDetails) {
        try {
          setAccountDetails({ ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedDetails) });
        } catch {
          setAccountDetails(INITIAL_ACCOUNT_DETAILS);
        }
      } else {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }

      const bannerKeys = [
        LOGIN_BANNER_KEY_1,
        LOGIN_BANNER_KEY_2,
        LOGIN_BANNER_KEY_3,
        LOGIN_BANNER_KEY_4,
        LOGIN_BANNER_KEY_5,
      ];
      const loadedBanners = bannerKeys
        .map((key) => localStorage.getItem(key))
        .filter((banner): banner is string => Boolean(banner?.startsWith("data:image")));

      setLoginBanners(loadedBanners.length > 0 ? loadedBanners : ["https://placehold.co/600x200.png?text=Banking+Made+Simple"]);
      inputRefs.current[0]?.focus();
    }).catch((storageError) => console.error("Could not restore local app data:", storageError));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loginBanners.length <= 1) return;
    const sliderInterval = window.setInterval(() => {
      setCurrentBannerIndex((index) => (index + 1) % loginBanners.length);
    }, 5000);
    return () => window.clearInterval(sliderInterval);
  }, [loginBanners.length]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const nextPin = [...pin];
    nextPin[index] = value;
    setPin(nextPin);
    setError(null);

    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    else if (!value && index > 0) inputRefs.current[index - 1]?.focus();

    if (nextPin.every((digit) => digit !== "") && nextPin.join("").length === 4) {
      const storedDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      let details: AccountDetailsType = { ...INITIAL_ACCOUNT_DETAILS };
      try {
        if (storedDetails) details = { ...details, ...JSON.parse(storedDetails) };
      } catch (storageError) {
        console.error("Could not read account details while recording login:", storageError);
      }
      details.lastLogin = new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
        timeZoneName: "short",
      }).format(new Date());
      localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(details));
      void persistStorageKeys(BOB_WORLD_STATE_KEYS).catch((storageError) =>
        console.error("Could not persist login timestamp to IndexedDB:", storageError)
      );
      setAccountDetails(details);
      router.push("/dashboard");
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullName = accountDetails.name?.trim() || "Customer";

  return (
    <div className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-white text-[#244d78]">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[clamp(118px,16svh,148px)]">
        <section className="shrink-0 rounded-b-[30px] bg-white px-5 pb-3 pt-2 shadow-[0_14px_28px_rgba(30,55,85,0.07)]">
          <div className="mx-auto flex h-[clamp(44px,6svh,54px)] w-full max-w-[360px] items-center justify-center gap-4">
            <img
              src="/assets/branding/bob-world-logo.png"
              alt="BOB World"
              className="h-[clamp(36px,5.4svh,46px)] w-[clamp(88px,27vw,108px)] object-contain"
            />
            <img
              src="/assets/branding/bank-of-baroda-logo.png"
              alt="Bank of Baroda"
              className="h-[clamp(34px,5.1svh,44px)] w-[clamp(150px,46vw,184px)] object-contain"
            />
          </div>

          <div className="relative mt-1 h-[clamp(76px,11svh,104px)] w-full overflow-hidden rounded-[18px] border border-[#e6e8eb] bg-[#f7f7f7]">
            {loginBanners.map((src, index) => (
              <Image
                key={src + index}
                src={src}
                alt={`Login banner ${index + 1}`}
                fill
                unoptimized={src.startsWith("data:")}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                  index === currentBannerIndex ? "opacity-100" : "opacity-0"
                )}
                priority={index === 0}
              />
            ))}
          </div>

          {loginBanners.length > 1 && (
            <div className="mt-1 flex items-center justify-center gap-[5px]" aria-label="Login banner pages">
              {loginBanners.map((_, index) => (
                <button
                  key={`banner-dot-${index}`}
                  type="button"
                  aria-label={`Show banner ${index + 1}`}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={cn(
                    "h-[4px] w-[18px] rounded-full transition-colors",
                    index === currentBannerIndex ? "bg-[#244d78]" : "bg-[#c4ccd5]"
                  )}
                />
              ))}
            </div>
          )}

          <div className="mt-2 flex min-h-[34px] items-center justify-between gap-3">
            <h1 className="truncate text-[clamp(22px,3.1svh,27px)] font-bold leading-tight tracking-[-0.5px] text-[#244d78]">
              Hi {fullName}!
            </h1>
            <Button variant="ghost" className="shrink-0 gap-1 px-1 text-[16px] font-bold text-[#244d78]">
              <span className="text-[11px]">अ</span>
              EN
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col items-stretch justify-evenly overflow-hidden px-5 py-1">
          <p className="mb-2 text-center text-[clamp(15px,2svh,17px)] font-bold text-[#244d78]">
            Use login PIN or face ID
          </p>

          <div
            className="mx-auto flex h-[clamp(48px,6.5svh,58px)] max-w-[280px] items-center justify-center gap-3 rounded-full bg-white pl-5 pr-1 shadow-[0_5px_18px_rgba(25,45,70,0.10)]"
          >
            {pin.map((digit, index) => (
              <div key={index} className="relative flex h-8 w-7 items-center justify-center">
                <Input
                  ref={(element) => { inputRefs.current[index] = element; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handlePinChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  aria-label={`Login PIN digit ${index + 1}`}
                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                />
                <PinInputCircle value={digit} />
              </div>
            ))}
            <button
              type="button"
              aria-label="Use face ID"
              onClick={() => setError("Face ID is not available on this device.")}
              className="ml-1 flex h-[clamp(44px,6svh,54px)] w-[clamp(44px,6svh,54px)] shrink-0 items-center justify-center rounded-full bg-[#244d78] text-white shadow-sm"
            >
              <ScanFace className="h-7 w-7" />
            </button>
          </div>

          {error && <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => router.push("/change-login-pin")}
            className="mx-auto mt-3 flex items-center justify-center gap-2 text-[clamp(14px,1.9svh,16px)] font-bold text-[#244d78]"
          >
            <Lock className="h-5 w-5 stroke-[1.8]" />
            Unlock/Forgot login PIN?
          </button>

          <div className="mt-2 flex items-start justify-center gap-4">
            <LoginAction icon={QrCode} label="Scan QR" onClick={() => router.push("/scan")} />
            <LoginAction icon={Eye} label="Quick view balance" onClick={() => router.push("/all-accounts")} />
            <LoginAction icon={MoreHorizontal} label="More" onClick={() => router.push("/more")} />
          </div>

          <button
            type="button"
            onClick={() => router.push("/digital-loan")}
            className="mx-auto mt-3 flex items-center justify-center text-[13px] font-bold text-[#244d78] underline underline-offset-2"
          >
            Apply for digital loans
          </button>

          <div className="mt-1 flex justify-center">
            <ChevronUp className="h-5 w-8 rotate-180 text-[#c5cbd3]" />
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 min-h-[clamp(112px,15svh,138px)] rounded-t-[30px] bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(20,40,65,0.08)]">
        <div className="mx-auto grid w-full max-w-[430px] grid-cols-4 gap-2">
          <FooterAction icon={Smartphone} label="Cash on mobile" onClick={() => router.push("/recharge")} />
          <FooterAction icon={CreditCard} label="Recharge & bill pay" onClick={() => router.push("/bill-pay")} />
          <FooterAction icon={Send} label="Fund Transfer" onClick={() => router.push("/fund-transfer")} />
          <FooterAction icon={HelpCircle} label="Need help?" onClick={() => router.push("/help")} />
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-[#929292]">
          v3.9.0 © Bank of Baroda. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
