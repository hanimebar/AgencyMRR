import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdvertisePage() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Advertise on AgencyMRR</h1>
        <p className="text-muted-foreground text-lg mb-12">
          Reach founders and investors in the Nordic startup ecosystem
        </p>

        <div className="space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Sponsored Listings</CardTitle>
              <CardDescription>
                Get featured at the top of the leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Highlight your startup with a sponsored listing that appears at the top of relevant
                leaderboard views. Perfect for raising visibility among investors and potential customers.
              </p>
              <Button asChild>
                <Link href="mailto:ads@agencymrr.com">Contact Us</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Banner Advertising</CardTitle>
              <CardDescription>
                Display your brand across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Place banner ads on high-traffic pages to reach our audience of founders, investors,
                and startup enthusiasts.
              </p>
              <Button asChild variant="outline">
                <Link href="mailto:ads@agencymrr.com">Get Pricing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Newsletter Sponsorship</CardTitle>
              <CardDescription>
                Reach our email subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Sponsor our weekly newsletter featuring the latest Nordic startup metrics and trends.
              </p>
              <Button asChild variant="outline">
                <Link href="mailto:ads@agencymrr.com">Learn More</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-6 glass-strong rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Interested in Advertising?</h2>
          <p className="text-muted-foreground mb-4">
            Contact us at <a href="mailto:ads@agencymrr.com" className="text-primary hover:underline">ads@agencymrr.com</a> to
            discuss advertising opportunities and pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
