"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-[56px] font-semibold leading-tight tracking-[-1.82px]">
            Linear Design System
          </h1>
          <p className="text-[17px] text-text-secondary leading-relaxed">
            Production-ready components and tokens from Linear.app
          </p>
        </div>

        {/* Colors */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Colors</h2>

          {/* Background Layers */}
          <Card>
            <CardHeader>
              <CardTitle>Background Layers</CardTitle>
              <CardDescription>Depth through subtle variations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-bg-primary border border-border-primary"></div>
                <p className="text-sm text-text-secondary">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-bg-secondary border border-border-primary"></div>
                <p className="text-sm text-text-secondary">Secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-bg-tertiary border border-border-primary"></div>
                <p className="text-sm text-text-secondary">Tertiary</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-bg-quaternary border border-border-primary"></div>
                <p className="text-sm text-text-secondary">Quaternary</p>
              </div>
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
              <CardDescription>Semantic color system</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Typography</h2>

          <Card>
            <CardContent className="space-y-6 pt-6">
              <div>
                <p className="text-[64px] font-medium leading-tight tracking-[-1.408px]">Display XL</p>
                <p className="text-text-tertiary text-sm">64px / 510 weight / -1.408px spacing</p>
              </div>
              <div>
                <p className="text-[40px] font-medium leading-snug tracking-[-0.88px]">Display MD</p>
                <p className="text-text-tertiary text-sm">40px / 510 weight / -0.88px spacing</p>
              </div>
              <div>
                <p className="text-[24px] font-medium tracking-[-0.288px]">Heading XL</p>
                <p className="text-text-tertiary text-sm">24px / 510 weight</p>
              </div>
              <div>
                <p className="text-[17px] font-medium">Heading MD</p>
                <p className="text-text-tertiary text-sm">17px / 510 weight</p>
              </div>
              <div>
                <p className="text-[15px]">Body text with proper line height and spacing for comfortable reading in longer form content.</p>
                <p className="text-text-tertiary text-sm">15px / 400 weight</p>
              </div>
              <div>
                <p className="text-[13px] text-text-secondary">Caption text for metadata and supplementary information</p>
                <p className="text-text-tertiary text-sm">13px / 400 weight</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Buttons</h2>

          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>All button styles with hover and active states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🎨</Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button variant="accent" disabled>Disabled Accent</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Cards</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simple Card</CardTitle>
                <CardDescription>Basic card with title and description</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-[15px]">
                  Cards use background layers and borders to create hierarchy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Footer</CardTitle>
                <CardDescription>Includes action buttons</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-[15px]">
                  Footer can contain buttons or other interactive elements.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="primary">Action</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Card</CardTitle>
                <CardDescription>With status badges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Active</Badge>
                  <span className="text-sm text-text-secondary">All systems operational</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Forms */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Form Elements</h2>

          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
              <CardDescription>Text inputs with Linear styling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Input</label>
                <Input placeholder="Enter text..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Input</label>
                <Input type="email" placeholder="email@example.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Disabled Input</label>
                <Input disabled placeholder="Disabled state" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Shadows */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Shadows</h2>

          <Card>
            <CardContent className="grid md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-3">
                <div className="h-32 rounded-lg bg-bg-secondary shadow-sm flex items-center justify-center">
                  <span className="text-text-secondary">Small</span>
                </div>
                <p className="text-sm text-text-secondary">shadow-sm</p>
              </div>

              <div className="space-y-3">
                <div className="h-32 rounded-lg bg-bg-secondary shadow-md flex items-center justify-center">
                  <span className="text-text-secondary">Medium</span>
                </div>
                <p className="text-sm text-text-secondary">shadow-md</p>
              </div>

              <div className="space-y-3">
                <div className="h-32 rounded-lg bg-bg-secondary shadow-lg flex items-center justify-center">
                  <span className="text-text-secondary">Large</span>
                </div>
                <p className="text-sm text-text-secondary">shadow-lg</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Interaction States */}
        <section className="space-y-6">
          <h2 className="text-[24px] font-medium tracking-[-0.288px]">Interaction States</h2>

          <Card>
            <CardHeader>
              <CardTitle>Hover & Active States</CardTitle>
              <CardDescription>Try interacting with these elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-bg-secondary hover:bg-[rgba(255,255,255,0.08)] active:scale-[0.97] transition-all cursor-pointer">
                Hover and click me
              </div>

              <div className="flex gap-3">
                <Button className="transition-transform hover:translate-x-1">
                  Slide on hover
                </Button>
                <Button className="transition-transform active:scale-[0.97]">
                  Scale on active
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="pt-12 pb-8 text-center text-text-tertiary text-sm">
          <p>Design system powered by Linear.app tokens</p>
        </div>
      </div>
    </div>
  );
}
