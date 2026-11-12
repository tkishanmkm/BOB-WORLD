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
import { generateLocalOtp } from '@/lib/fund-transfer';
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
  CheckCircle2,
  Clock3,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, persistStorageKeys, readAppState, removeAppState } from "@/lib/indexed-db";

const PinInputCircle: React.FC<{ value: string }> = ({ value }) => (
  <span
    aria-hidden="true"
    className={cn(
      "block h-[14px] w-[14px] rounded-full border-[2px] border-[#244d78] transition-colors",
      value ? "bg-[#244d78]" : "bg-white"
    )}
  />
);

type ReverificationStage = 'welcome' | 'code' | 'complete' | 'mpin';
type NotificationStage = 'hidden' | 'entering' | 'visible' | 'exiting';

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
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [superLogoutActive, setSuperLogoutActive] = useState(false);
  const [reverificationStage, setReverificationStage] = useState<ReverificationStage>('welcome');
  const [localCode, setLocalCode] = useState('');
  const [enteredLocalCode, setEnteredLocalCode] = useState('');
  const [reverificationCountdown, setReverificationCountdown] = useState(59);
  const [notificationAvatar, setNotificationAvatar] = useState<string | null>(null);
  const [notificationStage, setNotificationStage] = useState<NotificationStage>('hidden');
  const [notificationCycle, setNotificationCycle] = useState(0);
  const [isPinProcessing, setIsPinProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(async () => {
      const [storedLogout, storedAvatar] = await Promise.all([
        readAppState<boolean>(SUPER_LOGOUT_STORAGE_KEY),
        readAppState<string>(OTP_NOTIFICATION_AVATAR_KEY),
      ]);
      if (cancelled) return;
      setSuperLogoutActive(storedLogout === true);
      setNotificationAvatar(storedAvatar && storedAvatar.startsWith('data:image/') ? storedAvatar : null);
      setIsBootstrapped(true);
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
      setSuperLogoutActive(true);
      setError("Local app storage is unavailable. The app remains locked until storage can be restored.");
      setIsBootstrapped(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (superLogoutActive || loginBanners.length <= 1) return;
    const sliderInterval = window.setInterval(() => {
      setCurrentBannerIndex((index) => (index + 1) % loginBanners.length);
    }, 5000);
    return () => window.clearInterval(sliderInterval);
  }, [loginBanners.length, superLogoutActive]);

  useEffect(() => {
    if (!isBootstrapped || !superLogoutActive || reverificationStage !== 'code') return;

    setReverificationCountdown(59);
    setNotificationStage('hidden');
    const countdownTimer = window.setInterval(() => {
      setReverificationCountdown(value => Math.max(0, value - 1));
    }, 1000);

    let enterTimer: number | undefined;
    let exitTimer: number | undefined;
    let removeTimer: number | undefined;
    const notificationTimer = window.setTimeout(() => {
      setNotificationStage('entering');
      enterTimer = window.setTimeout(() => {
        setNotificationStage(current => current === 'entering' ? 'visible' : current);
      }, 500);
      exitTimer = window.setTimeout(() => {
        setNotificationStage('exiting');
        removeTimer = window.setTimeout(() => setNotificationStage('hidden'), 500);
      }, 5000);
    }, 4000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(notificationTimer);
      if (enterTimer !== undefined) window.clearTimeout(enterTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, [isBootstrapped, superLogoutActive, reverificationStage, notificationCycle]);

  const beginLocalReverification = () => {
    setError(null);
    setEnteredLocalCode('');
    setLocalCode(generateLocalOtp());
    setNotificationStage('hidden');
    setReverificationStage('code');
    setNotificationCycle(value => value + 1);
  };

  const resendLocalCode = () => {
    if (reverificationCountdown > 0) return;
    setError(null);
    setEnteredLocalCode('');
    setLocalCode(generateLocalOtp());
    setNotificationStage('hidden');
    setReverificationCountdown(59);
    setNotificationCycle(value => value + 1);
  };

  const verifyLocalCode = () => {
    if (reverificationCountdown <= 0) {
      setError('This local code has expired. Generate another local code to continue.');
      return;
    }
    if (!/^\d{6}$/.test(enteredLocalCode) || enteredLocalCode !== localCode) {
      setError('Incorrect local code. Please check the in-app notification and try again.');
      setEnteredLocalCode('');
      return;
    }
    setError(null);
    setNotificationStage('hidden');
    setReverificationStage('complete');
  };

  const handlePinChange = async (index: number, value: string) => {
    if (!/^\d?$/.test(value) || isPinProcessing) return;

    const nextPin = [...pin];
    nextPin[index] = value;
    setPin(nextPin);
    setError(null);

    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    else if (!value && index > 0) inputRefs.current[index - 1]?.focus();

    if (!nextPin.every((digit) => digit !== '') || nextPin.join('').length !== 4) return;

    setIsPinProcessing(true);
    try {
      const verifier = await readAppState<string>(LOGIN_MPIN_HASH_STORAGE_KEY);
      if (!verifier) throw new Error("Login MPIN is not configured. Set your four-digit MPIN in Settings first.");

      const isValidMpin = await verifyTpin(nextPin.join(''), verifier);
      if (!isValidMpin) throw new Error("Incorrect MPIN. Please try again.");

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
      await persistStorageKeys(BOB_WORLD_STATE_KEYS);

      if (superLogoutActive) {
        await removeAppState(SUPER_LOGOUT_STORAGE_KEY);
        setSuperLogoutActive(false);
      }

      setAccountDetails(details);
      router.push("/dashboard");
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : "MPIN verification failed.");
      setPin(["", "", "", ""]);
      window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } finally {
      setIsPinProcessing(false);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullName = accountDetails.name?.trim() || "Customer";

  if (!isBootstrapped) return null;

  if (superLogoutActive && reverificationStage === 'welcome') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8fa] px-5 py-8 text-[#1e293b]">
        <section className="w-full max-w-[390px] rounded-[26px] bg-white px-6 py-8 shadow-[0_10px_34px_rgba(15,23,42,0.10)]">
          <div className="mb-8 flex items-center justify-between">
            <img src="/assets/branding/bob-world-logo.png" alt="BOB World" className="h-10 w-[108px] object-contain object-left" />
            <img src="/assets/branding/bank-of-baroda-logo.png" alt="Bank of Baroda" className="h-8 max-w-[138px] object-contain object-right" />
          </div>
          <h1 className="text-[25px] font-bold tracking-tight text-[#244d78]">Hi {fullName}!</h1>
          <p className="mt-5 text-[17px] leading-[1.55] text-[#2c3542]">
            Your app is in Super Logout mode. Complete local app verification, then enter your saved MPIN to continue.
          </p>
          <p className="mt-3 rounded-xl bg-[#f4f7fa] p-3 text-xs leading-relaxed text-[#667085]">
            This is a device-only simulation. The verification code is generated inside this app and is not sent by SMS or verified by a bank.
          </p>
          {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-9 flex items-center justify-end gap-6">
            <Button type="button" variant="ghost" onClick={() => setError('Local verification is required before login.')} className="font-semibold text-[#667085]">CANCEL</Button>
            <Button type="button" onClick={beginLocalReverification} className="min-w-[104px] rounded-full bg-[#244d78] px-6 text-white hover:bg-[#1b3d61]">OK</Button>
          </div>
        </section>
      </div>
    );
  }

  if (superLogoutActive && reverificationStage === 'code') {
    const notificationClass = notificationStage === 'exiting'
      ? 'animate-out slide-out-to-top-12 duration-500 fade-out'
      : 'animate-in slide-in-from-top-12 duration-500 fade-in-25';

    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white text-[#244d78]">
        {notificationStage !== 'hidden' && (
          <div className="absolute left-1/2 top-3 z-50 w-[calc(100%-24px)] max-w-[410px] -translate-x-1/2" aria-live="polite">
            <div className={cn("rounded-2xl bg-zinc-900/95 p-3.5 text-white shadow-2xl backdrop-blur", notificationClass)}>
              <div className="flex items-start gap-3">
                {notificationAvatar
                  ? <img src={notificationAvatar} alt="Saved local notification avatar" className="h-11 w-11 shrink-0 rounded-full border border-white/20 object-cover" />
                  : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#244d78] text-sm font-bold text-white">BO</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold">BOB World App · Local</p>
                    <p className="text-[11px] text-white/60">now</p>
                  </div>
                  <p className="mt-1 text-[13px] text-white/90">Your local app verification code is:</p>
                  <p className="mt-2 text-center text-[25px] font-bold tracking-[0.32em]">{localCode}</p>
                  <p className="mt-1.5 text-[10px] leading-snug text-white/65">Generated on this device only. Not an SMS or bank-issued OTP.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="flex items-center justify-between border-b border-[#edf0f3] bg-white px-4 py-4">
          <Button type="button" variant="ghost" size="icon" aria-label="Back" onClick={() => { setReverificationStage('welcome'); setError(null); }}>
            <ArrowLeft className="h-5 w-5 text-[#244d78]" />
          </Button>
          <h1 className="text-[17px] font-bold text-[#244d78]">Local app verification</h1>
          <ShieldCheck className="h-6 w-6 text-[#244d78]" />
        </header>

        <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-5 pt-12">
          <div className="text-center">
            <h2 className="text-[18px] font-bold leading-snug text-[#1e293b]">Enter the six-digit local code to continue.</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#667085]">The code appears in the in-app notification above. Nothing is sent to your phone number.</p>
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f1f5f9] px-4 py-4 text-[#244d78]">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
            <p className="text-[12px] font-semibold leading-relaxed">Local-only verification. This code is not an SMS, bank-issued OTP, or proof of identity.</p>
          </div>

          <div className="flex-1" />

          <section className="rounded-t-[25px] bg-[#f8f9fb] px-4 pb-8 pt-6 shadow-[0_-10px_30px_rgba(15,23,42,0.06)]">
            <label htmlFor="local-reverification-code" className="mb-3 block text-[13px] font-bold text-[#667085]">Local verification code</label>
            <Input
              id="local-reverification-code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={enteredLocalCode}
              onChange={event => { setEnteredLocalCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
              placeholder="Enter 6-digit code"
              className="h-14 border-2 border-[#d9dee5] bg-white text-center text-lg tracking-[0.3em]"
            />
            <div className="mt-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-[#1e293b]">
                <Clock3 className="h-5 w-5" />
                <span>00:{String(reverificationCountdown).padStart(2, '0')}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" disabled={reverificationCountdown > 0} onClick={resendLocalCode} className="text-[12px] font-semibold text-[#667085] disabled:opacity-40">
                <RotateCcw className="mr-1.5 h-4 w-4" />Resend local code
              </Button>
            </div>
            {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
            <Button type="button" onClick={verifyLocalCode} disabled={enteredLocalCode.length !== 6 || reverificationCountdown <= 0} className="mt-7 h-14 w-full rounded-full bg-[#244d78] text-[17px] font-bold text-white hover:bg-[#1b3d61]">Verify</Button>
          </section>
        </main>
      </div>
    );
  }

  if (superLogoutActive && reverificationStage === 'complete') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center bg-white px-5 pb-10 pt-14 text-center">
        <div className="flex min-h-[62vh] w-full max-w-[390px] flex-col items-center justify-center rounded-[34px] bg-white px-7 shadow-[0_8px_30px_rgba(15,23,42,0.14)]">
          <div className="flex h-40 w-40 items-center justify-center rounded-full border-[8px] border-[#1bbd9c] p-3">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#1bbd9c] text-white">
              <CheckCircle2 className="h-[86px] w-[86px]" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="mt-8 text-[43px] font-extrabold tracking-wide text-[#111827]">DONE</h1>
          <p className="mt-5 text-lg font-bold text-[#111827]">Local verification completed.</p>
          <p className="mt-2 text-[13px] text-[#667085]">Your next step is the four-digit MPIN screen.</p>
        </div>
        <Button type="button" onClick={() => { setPin(["", "", "", ""]); setError(null); setReverificationStage('mpin'); }} className="mt-7 h-14 w-full max-w-[390px] rounded-full bg-[#244d78] text-[17px] font-bold text-white hover:bg-[#1b3d61]">
          Proceed to login
        </Button>
      </div>
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
            {superLogoutActive ? 'Enter your saved four-digit MPIN to complete Super Logout.' : 'Use login PIN or face ID'}
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
                  onChange={(event) => { void handlePinChange(index, event.target.value); }}
                  disabled={isPinProcessing}
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
