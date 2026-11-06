
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  INITIAL_ACCOUNT_DETAILS,
  ACCOUNT_DETAILS_STORAGE_KEY,
  LOGIN_BANNER_KEY_1,
  LOGIN_BANNER_KEY_2,
  LOGIN_BANNER_KEY_3,
  LOGIN_BANNER_KEY_4,
  LOGIN_BANNER_KEY_5,
} from '@/lib/constants';
import type { AccountDetailsType } from '@/lib/types';
import { ChevronDown, Lock, QrCode, Eye, MoreHorizontal, Smartphone, CreditCard, Send, HelpCircle, ScanFace, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SplashScreen } from '@/components/layout/splash-screen';
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, persistStorageKeys } from '@/lib/indexed-db';

const PinInputCircle: React.FC<{ value: string }> = ({ value }) => (
  <div className={cn(
    "h-5 w-5 rounded-full border-2 border-blue-800 flex items-center justify-center",
    value ? "bg-blue-800" : "bg-transparent"
  )}>
  </div>
);

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true);
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
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
        setAccountDetails(JSON.parse(storedDetails));
      } catch (e) {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }
    } else {
      setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }
    
    const bannerKeys = [LOGIN_BANNER_KEY_1, LOGIN_BANNER_KEY_2, LOGIN_BANNER_KEY_3, LOGIN_BANNER_KEY_4, LOGIN_BANNER_KEY_5];
    const loadedBanners = bannerKeys.map(key => {
      const storedBanner = localStorage.getItem(key);
      if (storedBanner && storedBanner.startsWith('data:image')) {
        return storedBanner;
      }
      return 'https://placehold.co/600x200.png'; // Default placeholder
    }).filter(banner => banner !== 'https://placehold.co/600x200.png'); // Filter out placeholders if you only want to show uploaded images

     if(loadedBanners.length > 0) {
      setLoginBanners(loadedBanners);
    } else {
      setLoginBanners(['https://placehold.co/600x200.png?text=Banner+1']);
    }

     if (inputRefs.current[0]) inputRefs.current[0]?.focus();
    }).catch(error => console.error('Could not restore local app data:', error));
    return () => { cancelled = true; };
  }, []);
  
  useEffect(() => {
    if (loginBanners.length > 1) {
      const sliderInterval = setInterval(() => {
        setCurrentBannerIndex(prevIndex => (prevIndex + 1) % loginBanners.length);
      }, 1000); // 1 second interval

      return () => clearInterval(sliderInterval);
    }
  }, [loginBanners.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000); // 4 seconds
    return () => clearTimeout(timer);
  }, []);


  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (newPin.every(digit => digit !== '') && newPin.join('').length === 4) {
      const storedDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      let details: AccountDetailsType = { ...INITIAL_ACCOUNT_DETAILS };
      try {
        if (storedDetails) details = { ...details, ...JSON.parse(storedDetails) };
      } catch (error) {
        console.error('Could not read account details while recording login:', error);
      }
      details.lastLogin = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'Asia/Kolkata', timeZoneName: 'short',
      }).format(new Date());
      localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(details));
      void persistStorageKeys(BOB_WORLD_STATE_KEYS).catch(error =>
        console.error('Could not persist login timestamp to IndexedDB:', error)
      );
      setAccountDetails(details);
      router.push('/dashboard');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const ActionButton: React.FC<{ icon: React.ElementType; label: string; href?: string }> = ({ icon: Icon, label, href }) => (
    <div className="flex flex-col items-center text-center group w-1/3">
      <Button variant="ghost" className="h-auto p-0 flex flex-col items-center">
        <div className="p-3 mb-1.5 bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
          <Icon className="h-6 w-6 text-primary group-hover:text-primary" />
        </div>
        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight">{label}</p>
      </Button>
    </div>
  );

  const BottomAction: React.FC<{ icon: React.ElementType; label: string; href?: string, iconColor?: string }> = ({ icon: Icon, label, href, iconColor = "text-primary" }) => (
    <div className="flex flex-col items-center text-center group">
       <Button variant="ghost" className="h-auto p-0 flex flex-col items-center">
        <div className={cn("p-3 mb-1 bg-card rounded-lg shadow-sm", iconColor === "text-red-600" ? "bg-red-100" : "bg-primary/10" )}>
            <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        <p className="text-xs font-medium text-foreground">{label}</p>
      </Button>
    </div>
  );


  return (
    <>
      {showSplash && <SplashScreen />}

      {!showSplash && (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 pt-6 space-y-5">
        <div className="flex items-center justify-between gap-4 min-h-14">
          <img src="/assets/branding/bob-world-logo.png" alt="BOB World" className="h-12 w-[112px] object-contain object-left" />
          <img src="/assets/branding/bank-of-baroda-logo.png" alt="Bank of Baroda" className="h-9 w-[148px] object-contain object-right" />
        </div>

        <div className="rounded-lg overflow-hidden shadow-md relative h-48">
          {loginBanners.map((src, index) => (
             <Image
              key={src + index}
              src={src}
              alt={`Login Banner ${index + 1}`}
              fill
              className={cn(
                "w-full h-full object-cover absolute transition-opacity duration-500 ease-in-out",
                index === currentBannerIndex ? "opacity-100" : "opacity-0"
              )}
              data-ai-hint="government cybercrime awareness"
              priority={index === 0}
            />
          ))}
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
            {loginBanners.map((_, index) => (
              <Dot
                key={`dot-${index}`}
                className={cn(
                  "h-4 w-4 text-white/50 transition-colors",
                  index === currentBannerIndex && "text-white"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-foreground">Hi {accountDetails.name.split(' ')[0]}!</h1>
          <Button variant="ghost" className="text-sm text-primary">
            EN <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <Card className="p-6 rounded-xl shadow-lg bg-card">
          <p className="text-center text-sm text-muted-foreground mb-1">Use login PIN or face ID</p>
          <div className="flex items-center justify-center space-x-3 my-4">
            {pin.map((digit, index) => (
              <div key={index} className="relative">
                <Input
                  ref={el => { inputRefs.current[index] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="absolute opacity-0 w-6 h-6 z-10 cursor-default"
                />
                <PinInputCircle value={digit} />
              </div>
            ))}
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-2 border-primary text-primary">
              <ScanFace className="h-7 w-7" />
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
          <div className="text-center">
            <Button variant="link" className="text-sm text-primary font-medium">
              <Lock className="h-4 w-4 mr-1.5" /> Unlock/Forgot login PIN?
            </Button>
          </div>
        </Card>


        <div className="flex justify-around items-start pt-2 pb-2">
          <ActionButton icon={QrCode} label="Scan QR" />
          <ActionButton icon={Eye} label="Quick view balance" />
          <ActionButton icon={MoreHorizontal} label="More" />
        </div>
      </main>

      <footer className="bg-muted/60 border-t p-3 shadow-top sticky bottom-0">
        <div className="grid grid-cols-4 gap-2">
            <BottomAction icon={Smartphone} label="Cash on mobile"/>
            <BottomAction icon={CreditCard} label="Recharge & bill pay" iconColor="text-red-600"/>
            <BottomAction icon={Send} label="Transfer"/>
            <BottomAction icon={HelpCircle} label="Need help?"/>
        </div>
      </footer>
    </div>
      )}
    </>
  );
}

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("bg-card p-4 rounded-lg shadow", className)} {...props}>
    {children}
  </div>
);

    
