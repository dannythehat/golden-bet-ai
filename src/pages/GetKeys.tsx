import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export default function GetKeys() {
  const [keys, setKeys] = useState<{ serviceRoleKey?: string; supabaseUrl?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://ffonednbxcfhzxardvry.supabase.co/functions/v1/get-service-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "FOOTY_ORACLE_2024" })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setKeys(data);
      }
    } catch (e) {
      setError("Failed to fetch keys");
    }
    setLoading(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">🔑 Get Colab Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!keys ? (
            <Button onClick={fetchKeys} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Reveal Keys"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supabase URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                    {keys.supabaseUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(keys.supabaseUrl!, "url")}
                  >
                    {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Service Role Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                    {showKey ? keys.serviceRoleKey : "••••••••••••••••••••"}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(keys.serviceRoleKey!, "key")}
                  >
                    {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Delete this page after copying keys!
              </p>
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
