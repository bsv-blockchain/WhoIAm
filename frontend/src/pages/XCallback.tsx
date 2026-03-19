import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, Globe, Lock } from "lucide-react";
import { XLogo } from "@/components/icons/XLogo";
import { toast } from "sonner";
import { getWalletClient, getAuthFetch, getIdentityClient } from "@/lib/wallet";
import {
  getCertifierConfig,
  getApiBaseUrl,
  CERTIFICATE_TYPES,
} from "@/lib/constants";
import { motion } from "framer-motion";

type Status = "loading" | "reveal" | "success" | "error";

export default function XCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [userName, setUserName] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const certRef = useRef<any>(null);

  useEffect(() => {
    async function process() {
      const success = searchParams.get("success");
      const error = searchParams.get("error");
      const uName = searchParams.get("userName");
      const profilePhoto = searchParams.get("profilePhoto");

      if (error) {
        toast.error("X verification failed");
        setStatus("error");
        return;
      }

      if (success === "true" && uName) {
        setUserName(uName);
        try {
          const wallet = getWalletClient();
          const { certifierPublicKey, apiUrl } = await getCertifierConfig();

          const newCert = await wallet.acquireCertificate({
            certifier: certifierPublicKey,
            certifierUrl: apiUrl,
            type: CERTIFICATE_TYPES.x,
            acquisitionProtocol: "issuance",
            fields: {
              userName: uName,
              profilePhoto: profilePhoto || "",
            },
          });

          certRef.current = newCert;
          setStatus("reveal");
        } catch (err: any) {
          console.error("Certificate acquisition failed:", err);
          toast.error("Failed to issue certificate");
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
    }

    process();
  }, [searchParams]);

  const handleReveal = async (reveal: boolean) => {
    if (reveal && certRef.current) {
      setIsRevealing(true);
      try {
        await getIdentityClient().publiclyRevealAttributes(certRef.current, [
          "userName",
          "profilePhoto",
        ]);
        toast.success("Your X handle is now publicly discoverable");
      } catch {
        toast.warning("Certificate issued but public revelation failed");
      } finally {
        setIsRevealing(false);
      }
    }
    setStatus("success");
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const authFetch = getAuthFetch();
      const res = await authFetch.fetch(`${getApiBaseUrl()}/api/x/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certType: "x" }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Posted to X!");
        if (data.data.tweetUrl) window.open(data.data.tweetUrl, "_blank");
      } else {
        toast.error(data.message || "Failed to share");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to share on X");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <CardContent className="p-5 sm:p-8 text-center">
              {status === "loading" && (
                <div className="py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-text-secondary">
                    Issuing your certificate...
                  </p>
                </div>
              )}

              {status === "reveal" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto mb-4">
                    <XLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    @{userName} verified
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Your certificate is in your wallet. Do you want others to be
                    able to find you by your X handle?
                  </p>

                  <div className="space-y-3 mb-6 text-left">
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                        If public
                      </p>
                      <p className="text-sm text-text-primary">
                        Anyone who knows{" "}
                        <span className="font-medium">@{userName}</span> can
                        look up your identityKey. Apps show your handle and
                        profile picture instead of your key.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                        If private
                      </p>
                      <p className="text-sm text-text-primary">
                        Your handle is not searchable. Only people you share
                        your certificate with directly can verify the link.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleReveal(false)}
                      disabled={isRevealing}
                    >
                      <Lock className="h-4 w-4" />
                      Keep private
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleReveal(true)}
                      disabled={isRevealing}
                    >
                      {isRevealing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      Make public
                    </Button>
                  </div>
                </>
              )}

              {status === "success" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto mb-4">
                    <XLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    X Account Verified!
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    You now have a certificate proving that you own the @
                    {userName} account on X.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={handleShare}
                      disabled={isSharing}
                      variant="outline"
                    >
                      {isSharing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      Share on X
                    </Button>
                    <Button onClick={() => navigate("/certificates")}>
                      View Certificates
                    </Button>
                    <Button variant="ghost" onClick={() => navigate("/")}>
                      Verify Another
                    </Button>
                  </div>
                </>
              )}

              {status === "error" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto mb-4">
                    <XLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Verification Failed
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Something went wrong during X verification. Please try
                    again.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate("/verify/x")}>
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")}>
                      Go Home
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Shell>
  );
}
