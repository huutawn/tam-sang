"use client"

import { useCampaigns } from "@/hooks/use-campaigns"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function FeaturedCampaigns() {
    const { data: campaigns, isLoading, isError } = useCampaigns()

    // Dummy fallback for visual demo if API fails/is empty
    const displayCampaigns = isError || !campaigns || campaigns.length === 0 ? [] : campaigns

    return (
        <section className="container py-12 md:py-24 lg:py-32">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Featured Campaigns</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Urgent causes that need your immediate attention and support.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
                {isLoading ? (
                    <>
                        {/* Bento Grid Skeletons: 1 large span-2, 2 small */}
                        <Skeleton className="md:col-span-2 md:row-span-2 h-[400px] md:h-full rounded-xl" />
                        <Skeleton className="md:col-span-1 h-[300px] rounded-xl" />
                        <Skeleton className="md:col-span-1 h-[300px] rounded-xl" />
                    </>
                ) : (
                    <>
                        {/* If we have campaigns, display them. For Bento, first one is large. */}
                        {displayCampaigns.length > 0 ? (
                            displayCampaigns.map((campaign, index) => {
                                const isLarge = index === 0;
                                return (
                                    <Card key={campaign.id} className={cn("flex flex-col overflow-hidden", isLarge ? "md:col-span-2 md:row-span-2" : "md:col-span-1")}>
                                        <div className={cn("relative bg-muted", isLarge ? "h-64 md:h-80" : "h-40")}>
                                            {/* Placeholder for Image */}
                                            {campaign.imageUrl && (
                                                <img
                                                    src={campaign.imageUrl}
                                                    alt={campaign.title}
                                                    className="h-full w-full object-cover transition-transform hover:scale-105 duration-500"
                                                />
                                            )}
                                        </div>
                                        <CardHeader>
                                            <CardTitle className={cn(isLarge ? "text-2xl" : "text-xl")}>{campaign.title}</CardTitle>
                                            <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium text-emerald-600">${campaign.currentAmount.toLocaleString()}</span>
                                                    <span className="text-muted-foreground">of ${campaign.targetAmount.toLocaleString()}</span>
                                                </div>
                                                <Progress value={(campaign.currentAmount / campaign.targetAmount) * 100} />
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button className="w-full" variant={isLarge ? "default" : "secondary"}>Donate Now</Button>
                                        </CardFooter>
                                    </Card>
                                )
                            })
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground">No active campaigns found at the moment.</div>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}
