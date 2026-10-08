<script setup>
const uid=Math.random().toString(36).slice(2,8)
const headingId=`panel-heading-${uid}`
</script>

<template>
    <section class="panel" :aria-labelledby="headingId">
        <header v-if="$slots.heading" class="panel-heading">
            <h2 :id="headingId">
                <slot name="heading"></slot>
            </h2>
        </header>

        <figure v-if="$slots.illustration" class="panel-illustration">
            <slot name="illustration"></slot>
        </figure>

        <div class="panel-content">
            <slot></slot>
        </div>

        <footer v-if="$slots.footer" class="panel-footer">
            <slot name="footer"></slot>
        </footer>
    </section>
</template>