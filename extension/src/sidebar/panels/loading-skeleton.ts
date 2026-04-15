export function renderLoadingSkeleton(): string {
  return `
    <section class="glance-panel">
      <div class="glance-skeleton glance-skeleton-title"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-med"></div>
      <div class="glance-skeleton glance-skeleton-short"></div>
    </section>
    <section class="glance-panel">
      <div class="glance-skeleton glance-skeleton-title"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-med"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-short"></div>
    </section>
    <section class="glance-panel">
      <div class="glance-skeleton glance-skeleton-title"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-med"></div>
    </section>
    <section class="glance-panel">
      <div class="glance-skeleton glance-skeleton-title"></div>
      <div class="glance-skeleton glance-skeleton-med"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-short"></div>
    </section>
    <section class="glance-panel">
      <div class="glance-skeleton glance-skeleton-title"></div>
      <div class="glance-skeleton glance-skeleton-wide"></div>
      <div class="glance-skeleton glance-skeleton-med"></div>
    </section>
  `;
}
