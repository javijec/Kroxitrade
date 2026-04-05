<script lang="ts">
  import { onDestroy, tick } from "svelte"
  import { languageStore, translate } from "../lib/services/i18n"
  import Button from "./Button.svelte"

  type OnboardingPage = "bookmarks" | "bulk" | "history" | "settings" | "about"
  type OnboardingStepId =
    | "create-folder"
    | "save-search"
    | "history"
    | "settings-tutorial"
    | "settings-sidebar"
    | "settings-language"
    | "settings-equivalent"
    | "settings-bulk"
    | "settings-history"
    | "settings-filters"
    | "settings-bookmarks"

  type OnboardingStep = {
    id: OnboardingStepId
    page: OnboardingPage
    targetSelector: string
    fallbackSelector?: string
    preferredPlacement?: "above" | "below" | "auto"
    eyebrow: string
    title: string
    body: string
    steps: string[]
  }

  export let open = false
  export let showHistoryStep = true
  export let onClose: () => void = () => {}
  export let onStepChange: (
    page: OnboardingPage,
    stepId: OnboardingStepId
  ) => void = () => {}

  let currentStep = 0
  let wasOpen = false
  let coachmarkStyle = ""
  let highlightStyle = ""
  let targetFound = false
  let syncInterval: ReturnType<typeof setInterval> | null = null
  let lastScrolledStepId: OnboardingStepId | null = null
  let layerElement: HTMLDivElement | null = null
  let coachmarkElement: HTMLElement | null = null
  let coachmarkPlacement: "above" | "below" = "below"

  $: allSteps = [
    {
      id: "create-folder" as OnboardingStepId,
      page: "bookmarks" as OnboardingPage,
      targetSelector: '[data-tutorial="new-folder"]',
      fallbackSelector: '[data-tutorial="bookmarks-panel"]',
      preferredPlacement: "below",
      eyebrow: translate($languageStore, "onboarding.step1Eyebrow"),
      title: translate($languageStore, "onboarding.step1Title"),
      body: translate($languageStore, "onboarding.step1Body"),
      steps: [
        translate($languageStore, "onboarding.step1Highlight1"),
        translate($languageStore, "onboarding.step1Highlight2"),
        translate($languageStore, "onboarding.step1Highlight3")
      ]
    },
    {
      id: "save-search" as OnboardingStepId,
      page: "bookmarks" as OnboardingPage,
      targetSelector: '[data-tutorial="save-search"]',
      fallbackSelector: '[data-tutorial="new-folder"]',
      preferredPlacement: "below",
      eyebrow: translate($languageStore, "onboarding.step2Eyebrow"),
      title: translate($languageStore, "onboarding.step2Title"),
      body: translate($languageStore, "onboarding.step2Body"),
      steps: [
        translate($languageStore, "onboarding.step2Highlight1"),
        translate($languageStore, "onboarding.step2Highlight2"),
        translate($languageStore, "onboarding.step2Highlight3")
      ]
    },
    {
      id: "history" as OnboardingStepId,
      page: "history" as OnboardingPage,
      targetSelector: '[data-tutorial="nav-history"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step3Eyebrow"),
      title: translate($languageStore, "onboarding.step3Title"),
      body: translate($languageStore, "onboarding.step3Body"),
      steps: [
        translate($languageStore, "onboarding.step3Highlight1"),
        translate($languageStore, "onboarding.step3Highlight2"),
        translate($languageStore, "onboarding.step3Highlight3")
      ]
    },
    {
      id: "settings-tutorial" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-tutorial"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step4Eyebrow"),
      title: translate($languageStore, "onboarding.step4Title"),
      body: translate($languageStore, "onboarding.step4Body"),
      steps: [
        translate($languageStore, "onboarding.step4Highlight1"),
        translate($languageStore, "onboarding.step4Highlight2"),
        translate($languageStore, "onboarding.step4Highlight3")
      ]
    },
    {
      id: "settings-sidebar" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-sidebar"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step5Eyebrow"),
      title: translate($languageStore, "onboarding.step5Title"),
      body: translate($languageStore, "onboarding.step5Body"),
      steps: [
        translate($languageStore, "onboarding.step5Highlight1"),
        translate($languageStore, "onboarding.step5Highlight2"),
        translate($languageStore, "onboarding.step5Highlight3")
      ]
    },
    {
      id: "settings-language" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-language"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step6Eyebrow"),
      title: translate($languageStore, "onboarding.step6Title"),
      body: translate($languageStore, "onboarding.step6Body"),
      steps: [
        translate($languageStore, "onboarding.step6Highlight1"),
        translate($languageStore, "onboarding.step6Highlight2"),
        translate($languageStore, "onboarding.step6Highlight3")
      ]
    },
    {
      id: "settings-equivalent" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-equivalent"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step7Eyebrow"),
      title: translate($languageStore, "onboarding.step7Title"),
      body: translate($languageStore, "onboarding.step7Body"),
      steps: [
        translate($languageStore, "onboarding.step7Highlight1"),
        translate($languageStore, "onboarding.step7Highlight2"),
        translate($languageStore, "onboarding.step7Highlight3")
      ]
    },
    {
      id: "settings-bulk" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-bulk"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step8Eyebrow"),
      title: translate($languageStore, "onboarding.step8Title"),
      body: translate($languageStore, "onboarding.step8Body"),
      steps: [
        translate($languageStore, "onboarding.step8Highlight1"),
        translate($languageStore, "onboarding.step8Highlight2"),
        translate($languageStore, "onboarding.step8Highlight3")
      ]
    },
    {
      id: "settings-history" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-history"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step9Eyebrow"),
      title: translate($languageStore, "onboarding.step9Title"),
      body: translate($languageStore, "onboarding.step9Body"),
      steps: [
        translate($languageStore, "onboarding.step9Highlight1"),
        translate($languageStore, "onboarding.step9Highlight2"),
        translate($languageStore, "onboarding.step9Highlight3")
      ]
    },
    {
      id: "settings-filters" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-filters"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step10Eyebrow"),
      title: translate($languageStore, "onboarding.step10Title"),
      body: translate($languageStore, "onboarding.step10Body"),
      steps: [
        translate($languageStore, "onboarding.step10Highlight1"),
        translate($languageStore, "onboarding.step10Highlight2"),
        translate($languageStore, "onboarding.step10Highlight3")
      ]
    },
    {
      id: "settings-bookmarks" as OnboardingStepId,
      page: "settings" as OnboardingPage,
      targetSelector: '[data-tutorial="settings-bookmarks"]',
      preferredPlacement: "above",
      eyebrow: translate($languageStore, "onboarding.step11Eyebrow"),
      title: translate($languageStore, "onboarding.step11Title"),
      body: translate($languageStore, "onboarding.step11Body"),
      steps: [
        translate($languageStore, "onboarding.step11Highlight1"),
        translate($languageStore, "onboarding.step11Highlight2"),
        translate($languageStore, "onboarding.step11Highlight3")
      ]
    }
  ]

  $: steps = showHistoryStep
    ? allSteps
    : allSteps.filter((step) => step.id !== "history")

  const getQueryRoot = (): Document | ShadowRoot => {
    const root = layerElement?.getRootNode()
    if (root && (root instanceof ShadowRoot || root instanceof Document)) {
      return root
    }

    return document
  }

  const getContainer = () =>
    getQueryRoot().querySelector<HTMLElement>("#kroxitrade-container")

  const getStepTarget = (step: OnboardingStep) => {
    const queryRoot = getQueryRoot()
    const directTarget = queryRoot.querySelector<HTMLElement>(step.targetSelector)
    if (directTarget) return directTarget

    return step.fallbackSelector
      ? queryRoot.querySelector<HTMLElement>(step.fallbackSelector)
      : null
  }

  const updatePosition = () => {
    if (!open || !steps.length) return

    const step = steps[currentStep]
    const container = getContainer()
    const target = getStepTarget(step)

    if (!container || !target) {
      targetFound = false
      highlightStyle = ""
      coachmarkStyle = "left: 10px; top: 10px; width: min(272px, calc(100% - 20px)); --pointer-left: 28px"
      return
    }

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const cardWidth = Math.min(272, Math.max(220, containerRect.width - 20))
    const cardHeight = coachmarkElement?.offsetHeight || 172
    const gap = 12
    const relativeTop = targetRect.top - containerRect.top
    const relativeLeft = targetRect.left - containerRect.left
    const targetCenterX = relativeLeft + targetRect.width / 2
    const spaceBelow = containerRect.height - (relativeTop + targetRect.height)
    const spaceAbove = relativeTop
    const preferredPlacement = step.preferredPlacement || "auto"
    const wantsBelow = preferredPlacement === "below"
      ? true
      : preferredPlacement === "above"
        ? false
        : spaceBelow >= 180 || relativeTop < 180
    const canPlaceBelow = spaceBelow >= cardHeight + gap
    const canPlaceAbove = spaceAbove >= cardHeight + gap
    const placeBelow = wantsBelow
      ? (canPlaceBelow || !canPlaceAbove)
      : !(canPlaceAbove || !canPlaceBelow)
    const proposedTop = placeBelow
      ? relativeTop + targetRect.height + gap
      : relativeTop - cardHeight - gap
    const maxLeft = Math.max(10, containerRect.width - cardWidth - 10)
    const left = Math.min(maxLeft, Math.max(10, targetCenterX - cardWidth / 2))
    const top = Math.min(
      Math.max(10, proposedTop),
      Math.max(10, containerRect.height - cardHeight - 10)
    )
    const pointerLeft = Math.min(
      cardWidth - 22,
      Math.max(22, targetCenterX - left)
    )

    targetFound = true
    coachmarkPlacement = placeBelow ? "below" : "above"
    highlightStyle = [
      `left: ${Math.max(6, relativeLeft - 4)}px`,
      `top: ${Math.max(6, relativeTop - 4)}px`,
      `width: ${targetRect.width + 8}px`,
      `height: ${targetRect.height + 8}px`
    ].join("; ")
    coachmarkStyle = [
      `left: ${left}px`,
      `top: ${top}px`,
      `width: ${cardWidth}px`,
      `--pointer-left: ${pointerLeft}px`
    ].join("; ")

    if (lastScrolledStepId !== step.id) {
      target.scrollIntoView({ block: "nearest", inline: "nearest" })
      lastScrolledStepId = step.id
    }
  }

  const startSync = async () => {
    if (!open) return

    await tick()
    await tick()
    updatePosition()

    if (syncInterval) {
      clearInterval(syncInterval)
    }

    syncInterval = setInterval(updatePosition, 250)
  }

  const stopSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  const nextStep = () => {
    if (currentStep >= steps.length - 1) {
      onClose()
      return
    }

    currentStep += 1
    lastScrolledStepId = null
  }

  const previousStep = () => {
    if (currentStep === 0) return
    currentStep -= 1
    lastScrolledStepId = null
  }

  const handleResize = () => {
    updatePosition()
  }

  $: if (open !== wasOpen) {
    if (open) {
      currentStep = 0
      lastScrolledStepId = null
      void startSync()
    } else {
      stopSync()
      targetFound = false
      coachmarkStyle = ""
      highlightStyle = ""
      lastScrolledStepId = null
    }

    wasOpen = open
  }

  $: if (open && steps[currentStep]) {
    onStepChange(steps[currentStep].page, steps[currentStep].id)
    void startSync()
  }

  onDestroy(() => {
    stopSync()
  })
</script>

<svelte:window on:resize={handleResize} on:scroll={handleResize} />

{#if open && steps[currentStep]}
  <div class="onboarding-layer" bind:this={layerElement} role="presentation">
    {#if targetFound}
      <div class="onboarding-highlight" style={highlightStyle}></div>
    {/if}

    <section
      bind:this={coachmarkElement}
      class="onboarding-coachmark"
      class:is-above={coachmarkPlacement === "above"}
      class:is-hidden={!targetFound}
      style={coachmarkStyle}
      role="dialog"
      aria-modal="false"
      aria-labelledby="onboarding-title">
      <div class="onboarding-coachmark__header">
        <div>
          <span class="onboarding-coachmark__eyebrow">
            {steps[currentStep].eyebrow}
          </span>
          <h2 id="onboarding-title">{steps[currentStep].title}</h2>
        </div>
        <button
          type="button"
          class="onboarding-close"
          aria-label={translate($languageStore, "onboarding.skip")}
          on:click={onClose}>×</button>
      </div>

      <p class="onboarding-coachmark__body">{steps[currentStep].body}</p>

      <ol class="onboarding-steps">
        {#each steps[currentStep].steps as step, index}
          <li class="onboarding-step-row">
            <span class="onboarding-step-index">{index + 1}</span>
            <span class="onboarding-step-copy">{step}</span>
          </li>
        {/each}
      </ol>

      <div class="onboarding-coachmark__footer">
        <span class="onboarding-progress">
          {translate($languageStore, "onboarding.stepCounter", {
            current: currentStep + 1,
            total: steps.length
          })}
        </span>
        <div class="onboarding-actions">
          {#if currentStep > 0}
            <Button
              label={translate($languageStore, "onboarding.back")}
              theme="blue"
              onClick={previousStep} />
          {/if}
          <Button
            label={currentStep === steps.length - 1
              ? translate($languageStore, "onboarding.finish")
              : translate($languageStore, "onboarding.next")}
            theme="gold"
            onClick={nextStep} />
        </div>
      </div>
    </section>
  </div>
{/if}

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .onboarding-layer {
    position: absolute;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
  }

  .onboarding-highlight {
    position: absolute;
    border-radius: 10px;
    border: 1px solid rgba($gold, 0.62);
    background: rgba($gold, 0.08);
    box-shadow:
      0 0 0 1px rgba($gold-alt, 0.28),
      0 0 22px rgba($gold, 0.18);
  }

  .onboarding-coachmark {
    position: absolute;
    padding: 14px;
    border: 1px solid rgba($gold, 0.22);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba($gold, 0.08), rgba($gold, 0.02)),
      rgba($poe-black, 0.98);
    box-shadow:
      inset 0 1px 0 rgba($white, 0.03),
      0 18px 38px rgba($black, 0.48);
    pointer-events: auto;

    &::before {
      content: "";
      position: absolute;
      top: -7px;
      left: calc(var(--pointer-left) - 8px);
      width: 14px;
      height: 14px;
      transform: rotate(45deg);
      background: rgba($poe-black, 0.98);
      border-left: 1px solid rgba($gold, 0.22);
      border-top: 1px solid rgba($gold, 0.22);
    }

    &.is-above::before {
      top: auto;
      bottom: -7px;
      border-left: none;
      border-top: none;
      border-right: 1px solid rgba($gold, 0.22);
      border-bottom: 1px solid rgba($gold, 0.22);
    }

    &.is-hidden {
      opacity: 0;
      pointer-events: none;
    }
  }

  .onboarding-coachmark__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;

    h2 {
      margin: 6px 0 0;
      font-family: $primary-font;
      font-size: 16px;
      line-height: 1.2;
      color: rgba($white, 0.96);
    }
  }

  .onboarding-coachmark__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 0 7px;
    border: 1px solid rgba($gold, 0.2);
    border-radius: 999px;
    background: rgba($gold, 0.09);
    color: rgba($gold-alt, 0.92);
    font-family: $primary-font;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .onboarding-close {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid rgba($white, 0.08);
    border-radius: 999px;
    background: rgba($black, 0.3);
    color: rgba($white, 0.76);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }

  .onboarding-coachmark__body {
    margin: 10px 0 0;
    color: rgba($white, 0.76);
    font-size: 11px;
    line-height: 1.5;
  }

  .onboarding-steps {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  .onboarding-step-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 9px;
    align-items: start;
  }

  .onboarding-step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid rgba($gold, 0.24);
    background: rgba($gold, 0.11);
    color: $gold;
    font-family: $primary-font;
    font-size: 11px;
    font-weight: 700;
  }

  .onboarding-step-copy {
    color: rgba($white, 0.88);
    font-size: 11px;
    line-height: 1.45;
  }

  .onboarding-coachmark__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 14px;
    flex-wrap: wrap;
  }

  .onboarding-progress {
    color: rgba($gold-alt, 0.86);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .onboarding-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
    flex-wrap: wrap;
  }
</style>
