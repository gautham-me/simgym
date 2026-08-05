import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const tokens = [
  { name: "background", var: "--background" },
  { name: "foreground", var: "--foreground" },
  { name: "card", var: "--card" },
  { name: "primary", var: "--primary" },
  { name: "secondary", var: "--secondary" },
  { name: "muted", var: "--muted" },
  { name: "accent", var: "--accent" },
  { name: "destructive", var: "--destructive" },
  { name: "border", var: "--border" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-16">
      <header className="space-y-2">
        <Badge variant="secondary">SimGym</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Design System</h1>
        <p className="text-muted-foreground max-w-2xl">
          Tokens and components built on shadcn/ui. This page is the source
          of truth for what SimGym&apos;s UI looks like — served at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">/DS</code>.
          Colors below are neutral placeholders; swap the values in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            app/globals.css
          </code>{" "}
          once brand colors are picked.
        </p>
      </header>

      <Section
        title="Tokens"
        description="Edit the CSS variable, every component using it updates everywhere."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tokens.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div
                className="size-8 shrink-0 rounded-md border"
                style={{ background: `var(${t.var})` }}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-muted-foreground text-xs truncate">
                  {t.var}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Button" description="Variants and sizes.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Separator />

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Separator />

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Regression intercepted</CardTitle>
            <CardDescription>
              A sandbox run caught a tool-call loop before it shipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              The Gym compared this trace against baseline and flagged 4
              divergent steps.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">View trace</Button>
            <Button size="sm" variant="outline">
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Separator />

      <Section title="Input & Label">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="prompt-name">Prompt name</Label>
          <Input id="prompt-name" placeholder="support-agent-v3" />
        </div>
      </Section>

      <Separator />

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm merge</DialogTitle>
              <DialogDescription>
                This prompt passed all 100 benchmark traces. Merge to
                production?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Merge</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>
    </div>
  );
}
