import { createFileRoute } from '@tanstack/react-router';
import { Button } from '../component/ui/button';
import { Input } from '../component/ui/input';
import { Label } from '../component/ui/label';
import { Card, CardContent } from '../component/ui/card';

export const Route = createFileRoute('/contacts')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-6 sm:py-12">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-8 sm:mb-12">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
						Get in Touch
					</h1>
					<p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
						Have a question or want to collaborate? We'd love to hear from you!
					</p>
				</div>

				<div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
					<Card>
						<CardContent className="p-4 sm:p-6 md:p-8">
						<div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
							<div className="p-3 sm:p-4 bg-blue-100 rounded-lg flex-shrink-0">
								<svg
									className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<div>
								<h3 className="text-lg sm:text-xl font-bold text-gray-900">Email</h3>
								<p className="text-sm sm:text-base text-gray-600">Send us an email</p>
							</div>
						</div>
						<p className="text-sm sm:text-base text-blue-600 font-medium break-all">support@wavefeed.com</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6 md:p-8">
						<div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
							<div className="p-3 sm:p-4 bg-green-100 rounded-lg flex-shrink-0">
								<svg
									className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
							<div>
								<h3 className="text-lg sm:text-xl font-bold text-gray-900">Discord</h3>
								<p className="text-sm sm:text-base text-gray-600">Join our community</p>
							</div>
						</div>
						<p className="text-sm sm:text-base text-green-600 font-medium break-all">discord.gg/wavefeed</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6 md:p-8">
						<div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
							<div className="p-3 sm:p-4 bg-purple-100 rounded-lg flex-shrink-0">
								<svg
									className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-600"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</div>
							<div>
								<h3 className="text-lg sm:text-xl font-bold text-gray-900">GitHub</h3>
								<p className="text-sm sm:text-base text-gray-600">Check out our code</p>
							</div>
						</div>
						<p className="text-sm sm:text-base text-purple-600 font-medium break-all">github.com/wavefeed</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6 md:p-8">
						<div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
							<div className="p-3 sm:p-4 bg-blue-100 rounded-lg flex-shrink-0">
								<svg
									className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
								</svg>
							</div>
							<div>
								<h3 className="text-lg sm:text-xl font-bold text-gray-900">LinkedIn</h3>
								<p className="text-sm sm:text-base text-gray-600">Connect with us</p>
							</div>
						</div>
						<p className="text-sm sm:text-base text-blue-600 font-medium break-all">linkedin.com/company/wavefeed</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardContent className="p-4 sm:p-6 md:p-8">
						<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
							Send us a Message
						</h2>
						<form className="space-y-4 sm:space-y-6">
							<div>
								<Label htmlFor="contact-name" className="mb-2 text-sm sm:text-base">
									Name
								</Label>
								<Input
									id="contact-name"
									type="text"
									placeholder="Your name"
									className="text-sm sm:text-base"
								/>
							</div>
							<div>
								<Label htmlFor="contact-email" className="mb-2 text-sm sm:text-base">
									Email
								</Label>
								<Input
									id="contact-email"
									type="email"
									placeholder="your.email@example.com"
									className="text-sm sm:text-base"
								/>
							</div>
							<div>
								<Label htmlFor="contact-message" className="mb-2 text-sm sm:text-base">
									Message
								</Label>
								<textarea
									id="contact-message"
									rows={5}
									className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
									placeholder="Your message..."
								/>
							</div>
							<Button
								type="submit"
								className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 sm:py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] text-sm sm:text-base"
							>
								Send Message
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
