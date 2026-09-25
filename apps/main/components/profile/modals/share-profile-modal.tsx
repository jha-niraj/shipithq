"use client";

/**
 * Share your public profile (plan/profile PRF-13).
 *
 * Niraj, 2026-09-25: make QR real and drop the rest. What was here:
 * - "Generate QR" and "Download Card" buttons with no onClick at all.
 * - An Embed tab that iframed the profile page - a page that, until PRF-12, asked
 *   every stranger to sign in.
 * - `TabsList className="grid w-full grid-cols-3"` overriding the base tabs.
 * Now: Link, Social and QR, on the base tabs with props only. The QR is real: it
 * encodes the canonical public URL and downloads as a PNG.
 */

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
	Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Check, Copy, Download, Link2, Mail, MessageCircle, Send } from "lucide-react";
import toast from "@repo/ui/components/ui/sonner";
import { publicProfileUrl } from "@/lib/urls";

interface ShareProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	username: string;
	name: string | null;
	image?: string | null;
	/** When not PUBLIC, the dialog says what others will see instead of the profile. */
	visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
}

export function ShareProfileModal({ isOpen, onClose, username, name, visibility = "PUBLIC" }: ShareProfileModalProps) {
	const [copied, setCopied] = useState(false);
	const qrRef = useRef<HTMLCanvasElement>(null);
	// From lib/urls.ts, never window.location: the author's host is not the recipient's.
	const url = publicProfileUrl(username);
	const who = name || username;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error("Could not copy the link");
		}
	};

	const downloadQr = () => {
		const canvas = qrRef.current;
		if (!canvas) return;
		const a = document.createElement("a");
		a.href = canvas.toDataURL("image/png");
		a.download = `${username}-shipithq-qr.png`;
		a.click();
	};

	const text = `${who} on ShipItHQ`;
	const u = encodeURIComponent(url);
	const t = encodeURIComponent(text);
	const targets = [
		{ label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, icon: <Send className="size-4" /> },
		{ label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: <Link2 className="size-4" /> },
		{ label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, icon: <MessageCircle className="size-4" /> },
		{ label: "Email", href: `mailto:?subject=${t}&body=${u}`, icon: <Mail className="size-4" /> },
	];

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share your profile</DialogTitle>
					<DialogDescription>Anyone with the link sees your public page, no account needed.</DialogDescription>
				</DialogHeader>

				{visibility !== "PUBLIC" && (
					<p className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
						{visibility === "PRIVATE"
							? "Your profile is private, so this link shows a not-found page to others. Change it in Edit profile, Privacy."
							: "Your profile is for followers only. Others see your name and a Follow button."}
					</p>
				)}

				<Tabs defaultValue="link">
					<TabsList variant="segmented" size="sm" fit>
						<TabsTrigger value="link">Link</TabsTrigger>
						<TabsTrigger value="social">Social</TabsTrigger>
						<TabsTrigger value="qr">QR code</TabsTrigger>
					</TabsList>

					<TabsContent value="link" className="mt-4 space-y-2">
						<div className="flex gap-2">
							<Input value={url} readOnly aria-label="Profile link" className="min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
							<Button onClick={copy} className="min-w-24 cursor-pointer">
								{copied ? <><Check className="mr-1.5 size-3.5" /> Copied</> : <><Copy className="mr-1.5 size-3.5" /> Copy</>}
							</Button>
						</div>
						<p className="text-xs text-neutral-500 dark:text-neutral-400">
							Link previews show your name, headline and photo.
						</p>
					</TabsContent>

					<TabsContent value="social" className="mt-4">
						<div className="grid grid-cols-2 gap-2">
							{targets.map((x) => (
								<Button key={x.label} asChild variant="outline" className="justify-start gap-2">
									<a href={x.href} target="_blank" rel="noopener noreferrer">{x.icon}{x.label}</a>
								</Button>
							))}
						</div>
					</TabsContent>
					<TabsContent value="qr" className="mt-4">
						<div className="flex flex-col items-center gap-4">
							{/* Black on white in both themes, on a constant white plate: a QR
							    has to scan, and scanners want dark modules on a light field. */}
							<div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800">
								<QRCodeCanvas
									ref={qrRef}
									value={url}
									size={512}
									level="M"
									marginSize={4}
									bgColor="#ffffff"
									fgColor="#000000"
									title={`QR code for ${url}`}
									style={{ width: 192, height: 192 }}
								/>
							</div>
							<p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
								Scan to open {who}&apos;s public profile. Good on a resume, a slide or a badge.
							</p>
							<Button onClick={downloadQr} variant="outline" className="cursor-pointer">
								<Download className="mr-1.5 size-3.5" /> Download PNG
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
