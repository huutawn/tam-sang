"use client"

import { useQuery } from "@tanstack/react-query"
import { CampaignService, ImpactStats } from "@/services/campaign.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, Activity } from "lucide-react"

export function LiveImpactStats() {
    const { data: stats, isLoading, isError } = useQuery<ImpactStats>({
        queryKey: ['impact-stats'],
        queryFn: CampaignService.getStats,
        refetchInterval: 30000, // Refresh every 30s
    })

    // Fallback data if error (or API not ready) for demo purposes
    const displayStats = isError ? { totalDonations: 1250000, totalCampaigns: 42 } : stats

    return (
        <section className="container py-12 md:py-16">
            <div className="grid gap-4 md:grid-cols-2 lg:gap-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                        <Heart className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[100px]" />
                        ) : (
                            <div className="text-2xl font-bold text-primary">
                                ${displayStats?.totalDonations.toLocaleString()}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Activity className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[100px]" />
                        ) : (
                            <div className="text-2xl font-bold text-emerald-600">
                                {displayStats?.totalCampaigns}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Across 5 different regions
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
