/**
 * Procastify UI kit.
 *
 * Every screen should be composed from these primitives so spacing, colour,
 * radius, focus and empty/loading states stay identical across features.
 */

// Foundations
export * from './tokens';

// Actions
export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

// Surfaces
export { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './Card';
export type { CardProps } from './Card';
export { PageContainer } from './PageContainer';
export { PageHeader } from './PageHeader';
export { SectionHeader } from './SectionHeader';
export { Toolbar, ToolbarDivider, ToolbarGroup } from './Toolbar';
export { Divider } from './Divider';

// Data display
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Avatar } from './Avatar';
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
export { ProgressBar } from './ProgressBar';
export { Kbd } from './Kbd';

// Navigation
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedOption } from './SegmentedControl';
export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { Dropdown } from './Dropdown';
export type { DropdownItem } from './Dropdown';

// Forms
export { Input } from './Input';
export type { InputProps } from './Input';
export { SearchInput } from './SearchInput';
export { Textarea } from './Textarea';
export { Select } from './Select';
export type { SelectOption } from './Select';
export { Field } from './Field';
export { Switch } from './Switch';
export { Checkbox } from './Checkbox';

// Overlays
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';
export { ConfirmDialog } from './ConfirmDialog';
export { Tooltip } from './Tooltip';
export type { TooltipSide } from './Tooltip';

// Feedback
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonCard } from './Skeleton';
export { Spinner, LoadingScreen } from './Spinner';
export { ToastProvider, useToast, notify } from './toast';
export type { ToastApi, ToastTone } from './toast';

// Hooks
export { useClickOutside } from './hooks/useClickOutside';
export { useDisclosure } from './hooks/useDisclosure';
export type { Disclosure } from './hooks/useDisclosure';
export { useBodyScrollLock } from './hooks/useBodyScrollLock';
