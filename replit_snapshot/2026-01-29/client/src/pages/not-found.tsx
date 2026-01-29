import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-none shadow-none bg-transparent">
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center mb-6 gap-4">
              <div className="p-4 bg-muted rounded-full">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
            </div>

            <p className="text-muted-foreground mb-8">
              The page you are looking for doesn't exist or has been moved.
            </p>
            
            <Link href="/">
              <Button size="lg">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
