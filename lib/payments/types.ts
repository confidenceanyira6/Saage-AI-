export interface InitializeOpts { email: string; amount: number; currency: string; reference: string; callbackUrl: string; }
export interface InitializeResult { checkoutUrl: string; reference: string; }
export interface VerifyResult { success: boolean; amount: number; currency: string; reference: string; providerTransactionId?: string; }
export interface PaymentProvider {
  name: 'paystack' | 'flutterwave';
  initialize(opts: InitializeOpts): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifyResult>;
}
