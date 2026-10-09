import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent } from '../component/ui/card';

export const Route = createFileRoute('/about')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-6 sm:py-12">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-8 sm:mb-12">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
						About WaveFeed
					</h1>
					<p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
						A modern social feed platform for developers to share ideas, connect,
						and grow together.
					</p>
				</div>

				<div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
					<Card>
						<CardContent className="p-4 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
							<div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
								<svg
									className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900">Fast</h2>
						</div>
						<p className="text-sm sm:text-base text-gray-600">
							Built with modern technologies for lightning-fast performance and
							seamless user experience.
						</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
							<div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
								<svg
									className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
							</div>
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900">Secure</h2>
						</div>
						<p className="text-sm sm:text-base text-gray-600">
							Your data is protected with industry-standard security practices
							and encryption.
						</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
							<div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
								<svg
									className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900">Community</h2>
						</div>
						<p className="text-sm sm:text-base text-gray-600">
							Connect with developers worldwide, share knowledge, and build
							amazing projects together.
						</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
							<div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
								<svg
									className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
									/>
								</svg>
							</div>
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900">Modern</h2>
						</div>
						<p className="text-sm sm:text-base text-gray-600">
							Built with the latest technologies: React, TypeScript, TanStack,
							and Tailwind CSS.
						</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardContent className="p-4 sm:p-6 md:p-8">
					<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Our Mission</h2>
					<p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-3 sm:mb-4">
						WaveFeed is designed to be a platform where developers can freely
						share their thoughts, projects, and experiences. We believe in
						fostering a supportive community that encourages learning and
						collaboration.
					</p>
					<p className="text-sm sm:text-base text-gray-600 leading-relaxed">
						Whether you're a beginner just starting your coding journey or an
						experienced developer looking to share your expertise, WaveFeed
						provides the tools and community you need to grow.
					</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
