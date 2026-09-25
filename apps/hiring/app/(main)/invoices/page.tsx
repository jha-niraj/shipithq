"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
    Receipt, Download, Filter, Search, AlertCircle, 
    CheckCircle, XCircle, Clock, FileText, Eye, ChevronLeft, 
    ChevronRight, Building2, Mail, MapPin
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Loading from "./loading"
import { Input } from "@repo/ui/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import { Alert, AlertDescription } from "@repo/ui/components/ui/alert"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@repo/ui/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@repo/ui/components/ui/table"
import { Separator } from "@repo/ui/components/ui/separator"
import { 
    getInvoices, getInvoiceById, getBillingOverview,
    type InvoiceDetails 
} from "@/actions/billing/invoice.action"

// Status configurations
const statusConfig = {
    PAID: { 
        label: "Paid", 
        icon: CheckCircle, 
        color: "text-neutral-800 dark:text-neutral-100",
        bg: "bg-neutral-100 dark:bg-neutral-800/30"
    },
    PENDING: { 
        label: "Pending", 
        icon: Clock, 
        color: "text-neutral-800 dark:text-neutral-100",
        bg: "bg-neutral-100 dark:bg-neutral-800/30"
    },
    DRAFT: { 
        label: "Draft", 
        icon: FileText, 
        color: "text-neutral-600 dark:text-neutral-400",
        bg: "bg-neutral-100 dark:bg-neutral-800"
    },
    VOID: { 
        label: "Void", 
        icon: XCircle, 
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30"
    },
    UNCOLLECTIBLE: { 
        label: "Uncollectible", 
        icon: XCircle, 
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30"
    },
}

function InvoiceCard({ 
    invoice, 
    onViewDetails 
}: { 
    invoice: InvoiceDetails
    onViewDetails: (id: string) => void 
}) {
    const config = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.PENDING
    const StatusIcon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${config.bg}`}>
                        <Receipt className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {invoice.invoiceNumber}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            {new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${config.bg} ${config.color} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                            </Badge>
                            {invoice.lineItems.length > 0 && (
                                <span className="text-xs text-neutral-500">
                                    {invoice.lineItems.length} item{invoice.lineItems.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                        {invoice.currency === "INR" ? "₹" : "$"}
                        {invoice.totalAmount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onViewDetails(invoice.id)}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                        </Button>
                        {invoice.pdfUrl && (
                            <Button variant="ghost" size="sm" asChild>
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function InvoiceDetailDialog({ 
    invoice, 
    open, 
    onClose 
}: { 
    invoice: InvoiceDetails | null
    open: boolean
    onClose: () => void 
}) {
    if (!invoice) return null

    const config = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.PENDING
    const StatusIcon = config.icon

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Invoice {invoice.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Created on {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <Badge className={`${config.bg} ${config.color} border-0 text-sm py-1 px-3`}>
                            <StatusIcon className="h-4 w-4 mr-2" />
                            {config.label}
                        </Badge>
                        {invoice.pdfUrl && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </a>
                            </Button>
                        )}
                    </div>

                    <Separator />

                    {/* Billing Details */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-neutral-500 mb-2">Billed To</h4>
                            <div className="space-y-1">
                                {invoice.billingName && (
                                    <p className="font-medium flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-neutral-400" />
                                        {invoice.billingName}
                                    </p>
                                )}
                                {invoice.billingEmail && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-neutral-400" />
                                        {invoice.billingEmail}
                                    </p>
                                )}
                                {(invoice.billingAddress || invoice.billingCity) && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                                        <span>
                                            {invoice.billingAddress && `${invoice.billingAddress}, `}
                                            {invoice.billingCity && `${invoice.billingCity}, `}
                                            {invoice.billingState && `${invoice.billingState}, `}
                                            {invoice.billingCountry}
                                            {invoice.billingPincode && ` - ${invoice.billingPincode}`}
                                        </span>
                                    </p>
                                )}
                                {invoice.gstNumber && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        GST: {invoice.gstNumber}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-neutral-500 mb-2">Invoice Details</h4>
                            <div className="space-y-1 text-sm">
                                <p className="flex justify-between">
                                    <span className="text-neutral-500">Invoice Date:</span>
                                    <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                                </p>
                                {invoice.dueDate && (
                                    <p className="flex justify-between">
                                        <span className="text-neutral-500">Due Date:</span>
                                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                                    </p>
                                )}
                                {invoice.paidAt && (
                                    <p className="flex justify-between">
                                        <span className="text-neutral-500">Paid On:</span>
                                        <span>{new Date(invoice.paidAt).toLocaleDateString()}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Line Items */}
                    <div>
                        <h4 className="text-sm font-medium text-neutral-500 mb-3">Items</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.lineItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {invoice.currency === "INR" ? "₹" : "$"}
                                            {item.unitPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {invoice.currency === "INR" ? "₹" : "$"}
                                            {item.amount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Totals */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Subtotal</span>
                                <span>
                                    {invoice.currency === "INR" ? "₹" : "$"}
                                    {invoice.subtotal.toLocaleString()}
                                </span>
                            </div>
                            {invoice.taxAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Tax ({invoice.taxRate}%)</span>
                                    <span>
                                        {invoice.currency === "INR" ? "₹" : "$"}
                                        {invoice.taxAmount.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-neutral-800">
                                    <span>Discount</span>
                                    <span>
                                        -{invoice.currency === "INR" ? "₹" : "$"}
                                        {invoice.discount.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>
                                    {invoice.currency === "INR" ? "₹" : "$"}
                                    {invoice.totalAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div>
                            <h4 className="text-sm font-medium text-neutral-500 mb-2">Notes</h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {invoice.notes}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceDetails[]>([])
    const [filteredInvoices, setFilteredInvoices] = useState<InvoiceDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [overview, setOverview] = useState<{
        totalSpent: number
        currency: string
        invoiceCount: number
    } | null>(null)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [invoicesResult, overviewResult] = await Promise.all([
                    getInvoices(50),
                    getBillingOverview()
                ])

                if (invoicesResult.success) {
                    setInvoices(invoicesResult.invoices)
                    setFilteredInvoices(invoicesResult.invoices)
                }
                if (overviewResult.success && overviewResult.data) {
                    setOverview(overviewResult.data)
                }
            } catch (err: unknown) {
                setError("Failed to load invoices")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Filter invoices
    useEffect(() => {
        let filtered = invoices

        if (statusFilter !== "all") {
            filtered = filtered.filter(i => i.status === statusFilter)
        }

        if (searchQuery) {
            filtered = filtered.filter(i => 
                i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.billingName?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredInvoices(filtered)
        setCurrentPage(1)
    }, [invoices, statusFilter, searchQuery])

    const handleViewDetails = async (invoiceId: string) => {
        const result = await getInvoiceById(invoiceId)
        if (result.success && result.invoice) {
            setSelectedInvoice(result.invoice)
            setDetailDialogOpen(true)
        }
    }

    // Pagination
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    if (loading) {
        return <Loading />
    }

    // Calculate stats
    const paidInvoices = invoices.filter(i => i.status === "PAID")
    const pendingInvoices = invoices.filter(i => i.status === "PENDING")
    const totalAmount = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0)

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Invoices"
                subtitle="View and download your billing invoices"
            />

            {/* Error Alert */}
            {error && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats Cards */}
            <StatBand
                cols={4}
                items={[
                    { icon: Receipt, label: "Total Invoiced", value: `${overview?.currency === "INR" ? "₹" : "$"}${totalAmount.toLocaleString()}` },
                    { icon: FileText, label: "Total Invoices", value: invoices.length },
                    { icon: CheckCircle, label: "Paid", value: paidInvoices.length },
                    { icon: Clock, label: "Pending", value: pendingInvoices.length },
                ]}
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                        placeholder="Search invoices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="VOID">Void</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
                {paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map((invoice) => (
                        <InvoiceCard 
                            key={invoice.id} 
                            invoice={invoice} 
                            onViewDetails={handleViewDetails}
                        />
                    ))
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <Receipt className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-500">No invoices found</p>
                        <p className="text-sm text-neutral-400 mt-1">
                            {statusFilter !== "all" || searchQuery 
                                ? "Try adjusting your filters" 
                                : "Invoices will appear here after your first payment"
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Invoice Detail Dialog */}
            <InvoiceDetailDialog
                invoice={selectedInvoice}
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
            />
        </div>
    )
}
