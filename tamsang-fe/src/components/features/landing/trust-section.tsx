import { ShieldCheck, Brain, FileDigit } from "lucide-react"

export function TrustSection() {
    return (
        <section className="bg-slate-50 py-20 dark:bg-slate-900">
            <div className="container px-4 md:px-6">
                <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-2 md:grid-cols-3 lg:gap-16">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <FileDigit className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Immutable Ledger</h3>
                        <p className="text-muted-foreground">
                            Every transaction is recorded on the blockchain, ensuring that your donation history is permanent and tamper-proof.
                        </p>
                    </div>
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Brain className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">AI Vetting</h3>
                        <p className="text-muted-foreground">
                            Advanced AI algorithms analyze campaign authenticity and beneficiary data to prevent fraud before it happens.
                        </p>
                    </div>
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Transparent Flow</h3>
                        <p className="text-muted-foreground">
                            Track your fund's journey from your wallet directly to the beneficiary's hands with real-time updates.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
