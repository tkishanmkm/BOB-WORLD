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
  LOGIN_MPIN_HASH_STORAGE_KEY,
  OTP_NOTIFICATION_AVATAR_KEY,
  SUPER_LOGOUT_STORAGE_KEY,
} from "@/lib/constants";
import { verifyTpin } from '@/lib/tpin-security';
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
  ArrowLeft,
  CircleHelp,
  Clock3,
  RotateCcw,
  ShieldCheck,
  Check,
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
  const [isSuperLogoutChecked, setIsSuperLogoutChecked] = useState(false);
  const [superLogoutActive, setSuperLogoutActive] = useState(false);
  const [superLogoutStage, setSuperLogoutStage] = useState<"welcome" | "otp" | "success">("welcome");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(59);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpNotificationAvatar, setOtpNotificationAvatar] = useState<string | null>(null);
  const [notificationStage, setNotificationStage] = useState<"hidden" | "entering" | "visible" | "exiting">("hidden");
  const [notificationCycle, setNotificationCycle] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
      if (cancelled) return;
      const logoutPending = localStorage.getItem(SUPER_LOGOUT_STORAGE_KEY) === "1";
      const savedAvatar = localStorage.getItem(OTP_NOTIFICATION_AVATAR_KEY);
      setSuperLogoutActive(logoutPending);
      setSuperLogoutStage("welcome");
      setOtpNotificationAvatar(savedAvatar && savedAvatar.startsWith("data:image/") ? savedAvatar : null);
      setIsSuperLogoutChecked(true);
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
    }).catch((storageError) => {
      console.error("Could not restore local app data:", storageError);
      const logoutPending = localStorage.getItem(SUPER_LOGOUT_STORAGE_KEY) === "1";
      const savedAvatar = localStorage.getItem(OTP_NOTIFICATION_AVATAR_KEY);
      setSuperLogoutActive(logoutPending);
      setOtpNotificationAvatar(savedAvatar && savedAvatar.startsWith("data:image/") ? savedAvatar : null);
      setIsSuperLogoutChecked(true);
    });

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

  useEffect(() => {
    if (!superLogoutActive || superLogoutStage !== "otp") return;
    setOtpCountdown(59);
    setNotificationStage("hidden");
    let enterTimer: number | undefined;
    let visibleTimer: number | undefined;
    let exitTimer: number | undefined;
    const showTimer = window.setTimeout(() => {
      setNotificationStage("entering");
      enterTimer = window.setTimeout(() => setNotificationStage("visible"), 500);
      visibleTimer = window.setTimeout(() => {
        setNotificationStage("exiting");
        exitTimer = window.setTimeout(() => setNotificationStage("hidden"), 500);
      }, 3500);
    }, 2000);
    return () => {
      window.clearTimeout(showTimer);
      if (enterTimer !== undefined) window.clearTimeout(enterTimer);
      if (visibleTimer !== undefined) window.clearTimeout(visibleTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [superLogoutActive, superLogoutStage, notificationCycle]);

  useEffect(() => {
    if (!superLogoutActive || superLogoutStage !== "otp") return;
    const countdownTimer = window.setInterval(() => {
      setOtpCountdown(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(countdownTimer);
  }, [superLogoutActive, superLogoutStage, notificationCycle]);

  const createOtp = () => {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    const nextOtp = String((random[0] % 900000) + 100000);
    setGeneratedOtp(nextOtp);
    setEnteredOtp("");
    setOtpCountdown(59);
    setOtpExpiresAt(Date.now() + 180000);
    setNotificationStage("hidden");
    setNotificationCycle(value => value + 1);
  };

  const beginOtpVerification = () => {
    createOtp();
    setError(null);
    setSuperLogoutStage("otp");
  };

  const resendOtp = () => {
    if (otpCountdown > 0) return;
    createOtp();
    setError(null);
  };

  const verifyOtp = () => {
    if (Date.now() > otpExpiresAt) {
      setError("OTP expired. Resend OTP to continue.");
      return;
    }
    if (!/^\d{6}$/.test(enteredOtp) || enteredOtp !== generatedOtp) {
      setError("Incorrect OTP. Please try again.");
      setEnteredOtp("");
      return;
    }
    setError(null);
    setNotificationStage("hidden");
    setSuperLogoutStage("success");
  };

  const cancelSuperLogout = () => {
    localStorage.removeItem(SUPER_LOGOUT_STORAGE_KEY);
    setSuperLogoutActive(false);
    setError(null);
    setPin(["", "", "", ""]);
  };

  const completeSuperLogout = () => {
    localStorage.removeItem(SUPER_LOGOUT_STORAGE_KEY);
    setSuperLogoutActive(false);
    setSuperLogoutStage("welcome");
    setEnteredOtp("");
    setGeneratedOtp("");
    setPin(["", "", "", ""]);
    setError(null);
    inputRefs.current[0]?.focus();
  };

  const handlePinChange = async (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const nextPin = [...pin];
    nextPin[index] = value;
    setPin(nextPin);
    setError(null);

    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    else if (!value && index > 0) inputRefs.current[index - 1]?.focus();

    if (nextPin.every((digit) => digit !== "") && nextPin.join("").length === 4) {
      const verifier = localStorage.getItem(LOGIN_MPIN_HASH_STORAGE_KEY);
      if (!verifier) {
        setError("Login MPIN is not configured. Set your four-digit MPIN in Settings first.");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      const isValidMpin = await verifyTpin(nextPin.join(""), verifier);
      if (!isValidMpin) {
        setError("Incorrect MPIN. Please try again.");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
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
  const displayName = fullName.toLocaleUpperCase("en-IN");
  const phoneDigits = (accountDetails.phoneNumber || "").replace(/\D/g, "");
  const registeredMobile = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

  if (!isSuperLogoutChecked) return <div className="fixed inset-0 z-[100]"><img src="/assets/branding/bob-world-splash-v3.9.0.png" alt="BOB World" className="h-full w-full object-cover" /></div>;

  if (superLogoutActive && superLogoutStage === "welcome") {
    return (
      <main className="fixed inset-0 z-[90] h-[100dvh] w-full overflow-hidden bg-[#a53c17] text-black">
        <img src="/assets/branding/bob-world-splash-v3.9.0.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/35" />
        <section className="absolute left-1/2 top-[40.2%] w-[calc(100%-44px)] max-w-[390px] -translate-x-1/2 bg-white px-6 pb-6 pt-6 shadow-none">
          <h1 className="text-[20px] font-normal leading-[1.25] text-black">bob World</h1>
          <p className="mt-5 text-[15.5px] leading-[1.22] text-black">Hi {displayName}, we haven&apos;t seen you for a long. Please verify yourself, enter 6-digit OTP sent on your registered mobile number.</p>
          <div className="mt-10 flex items-center justify-end gap-9">
            <button type="button" onClick={cancelSuperLogout} className="px-1 py-1 text-[14px] font-medium text-black">CANCEL</button>
            <button type="button" onClick={beginOtpVerification} className="px-1 py-1 text-[14px] font-medium text-black">OK</button>
          </div>
        </section>
      </main>
    );
  }

  if (superLogoutActive && superLogoutStage === "otp") {
    const notificationVisible = notificationStage === "visible";
    return (
      <main className="fixed inset-0 z-[90] h-[100dvh] w-full overflow-hidden bg-white text-[#101828]">
        {notificationStage !== "hidden" && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-2 z-[120] w-[calc(100%-16px)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-md bg-[#38383b] text-white shadow-xl transition-transform transition-opacity duration-500 ease-out"
            style={{ transform: notificationVisible ? "translate(-50%, 0)" : "translate(-50%, -125%)", opacity: notificationVisible ? 1 : 0 }}
          >
            <div className="flex min-h-[68px] items-center gap-3 px-3 py-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
                {otpNotificationAvatar
                  ? <img src={otpNotificationAvatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                  : <svg viewBox="0 0 44 44" aria-hidden="true" className="h-11 w-11"><circle cx="22" cy="22" r="22" fill="#d1d5db" /><circle cx="22" cy="15" r="7" fill="#fff" /><path d="M7 38c1-8 7-13 15-13s14 5 15 13" fill="#fff" /></svg>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium leading-5">JK-BOBOTP-S</div>
                <p className="mt-1 whitespace-normal break-words text-sm leading-5 text-white/90">Dear Customer, Your OTP is <span className="font-bold tracking-wide">{generatedOtp}</span> and is valid for only 180 sec. Do not share it with anyone.</p>
              </div>
            </div>
          </div>
        )}

        <header className="flex h-[66px] items-center justify-between border-b border-[#e8ebef] bg-white px-5 pt-1">
          <button type="button" aria-label="Back" onClick={() => { setNotificationStage("hidden"); setSuperLogoutStage("welcome"); setError(null); }} className="flex h-10 w-10 items-center justify-start text-[#203f6c]"><ArrowLeft className="h-7 w-7" strokeWidth={2.5} /></button>
          <h1 className="text-[18px] font-bold text-black">One time password verification</h1>
          <button type="button" aria-label="OTP help" title="OTP help" className="flex h-10 w-10 items-center justify-end text-[#203f6c]"><CircleHelp className="h-7 w-7" strokeWidth={2} /></button>
        </header>

        <section className="px-8 pt-10 text-center">
          <p className="mx-auto max-w-[360px] text-[17px] font-bold leading-[1.14] text-[#101828]">We have sent a 6-digit OTP to your mobile number {registeredMobile}. Please enter the OTP to verify your mobile number.</p>
          <div className="mx-auto mt-8 flex min-h-[50px] max-w-[370px] items-center gap-3 rounded-[16px] bg-[#fff0eb] px-4 py-3 text-left text-[#df6047]">
            <ShieldCheck className="h-7 w-7 shrink-0 fill-[#ff826e] stroke-[#d94f38]" strokeWidth={1.8} />
            <p className="text-[14px] font-bold leading-[1.12]">Never share your OTP with anyone. The Bank or its employees will never ask you for your OTP.</p>
          </div>
        </section>

        <section className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[34px] bg-white px-8 pb-[max(28px,env(safe-area-inset-bottom))] pt-7 shadow-[0_-18px_40px_rgba(16,24,40,0.08)]">
          <label htmlFor="bob-super-otp" className="mb-3 block text-[16px] font-bold text-[#b7b7b7]">Reference IDs</label>
          <Input id="bob-super-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={enteredOtp} onChange={event => { setEnteredOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} onKeyDown={event => { if (event.key === "Enter") verifyOtp(); }} placeholder="Enter OTP" className="h-[58px] rounded-[7px] border border-[#cfd8e3] bg-white px-3 text-[16px] text-black placeholder:text-black focus-visible:ring-[#244d78]" />
          <div className="mt-7 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#111827]"><Clock3 className="h-7 w-7" strokeWidth={2.2} /><span className="text-[19px] font-bold tabular-nums">00:{String(otpCountdown).padStart(2, "0")}</span></div>
            <button type="button" onClick={resendOtp} disabled={otpCountdown > 0} className="flex items-center gap-2 text-[17px] font-bold text-[#a8a8a8] disabled:opacity-100"><RotateCcw className="h-7 w-7" strokeWidth={2.5} /><span>Resend OTP</span></button>
          </div>
          {error && <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">{error}</p>}
          <Button type="button" onClick={verifyOtp} className="mt-7 h-[53px] w-full rounded-full bg-[#203d68] text-[18px] font-bold text-white hover:bg-[#193457]">Verify</Button>
        </section>
      </main>
    );
  }

  if (superLogoutActive && superLogoutStage === "success") {
    return (
      <main className="fixed inset-0 z-[90] h-[100dvh] w-full overflow-hidden bg-white text-[#080f1b]">
        <div className="absolute inset-x-0 top-0 h-[23vh] bg-[#ff704d]" />
        <svg className="absolute left-0 top-[15.5vh] h-[110px] w-full" viewBox="0 0 430 110" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 C76 50 112 48 174 19 C250 -15 319 3 430 45 L430 110 L0 110 Z" fill="#fff" /></svg>
        <section className="absolute left-1/2 top-[17.2vh] flex h-[60.3vh] w-[calc(100%-54px)] max-w-[390px] -translate-x-1/2 flex-col items-center bg-white px-5 pt-[88px] shadow-[0_5px_9px_rgba(0,0,0,0.28)]" style={{ borderRadius: "34px" }}>
          <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#1bbd9c] p-[6px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#1bbd9c] text-white"><Check className="h-[54px] w-[54px]" strokeWidth={3.8} /></div>
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold tracking-[0.02em] text-[#080f1b]">DONE</h1>
          <p className="mt-6 text-center text-[17px] font-bold text-[#080f1b]">OTP validated successfully.</p>
        </section>
        <Button type="button" onClick={completeSuperLogout} className="absolute left-1/2 top-[80vh] h-[53px] w-[calc(100%-80px)] max-w-[350px] -translate-x-1/2 rounded-full bg-[#203d68] text-[17px] font-bold text-white hover:bg-[#193457]">Proceed to login</Button>
      </main>
    );
  }

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
              onClick={() => setError("Face ID is not enrolled for this app on this device. Enter your MPIN to log in.")}
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
