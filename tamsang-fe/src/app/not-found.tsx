import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex h-[100vh] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-4xl font-bold text-primary">404 Not Found</h2>
            <p className="text-lg text-muted-foreground">Could not find the requested resource.</p>
            <Button asChild>
                <Link href="/">Return Home</Link>
            </Button>
        </div>
    )
}
