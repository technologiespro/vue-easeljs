import Vue from 'vue';
import assert from 'assert';
import easeljs from '../../easeljs/easel.js';

const wait = function (component, count = 1) {
    let promise = Promise.all([
        component.getCacheBounds(),
        Vue.nextTick(),
    ]);
    if (count > 1) {
        return promise.then(() => wait(component, count - 1));
    } else {
        return promise;
    }
};

export default function (implementor, extra_attributes = '') {
    return function () {

        const buildVm = function () {
            /**
             * A fake easel object
             */
            const easel = {
                addChild() {
                },
                removeChild() {
                },
                createCanvas(cb) {
                    return cb();
                },
            };

            const vm = new Vue({
                template: `
                    <span>
                        <implementor ref="fake"
                            v-if="showFake"
                            :cache="cache"
                            :filters="filters"
                            ${extra_attributes}
                        >
                        </implementor>
                    </span>
                `,
                provide() {
                    return {
                        easelParent: easel,
                        easelCanvas: easel,
                    };
                },
                data() {
                    return {
                        showFake: true,
                        cache: false,
                        filters: null,
                    };
                },
                components: {
                    implementor,
                },
                methods: {
                },
            }).$mount();

            const fake = vm.$refs.fake;

            return {fake, vm, easel};
        };

        it('should exist', function () {
            const {vm, fake} = buildVm();
            assert(fake);
        });

        it('should have $el', function () {
            const {vm, fake} = buildVm();
            assert(fake.$el);
        });

        it('should have component field', function () {
            const {vm, fake} = buildVm();
            assert(fake.component);
        });

        it('should have a filter', function (done) {
            const {vm, fake} = buildVm();
            vm.filters = [['BlurFilter', 5, 5, 1]];
            vm.cache = true;
            wait(fake, 2)
                .then(() => {
                    assert(fake.component.cacheCanvas !== null, 'no cache');
                    assert(fake.component.filters, 80);
                    assert(fake.component.filters.length === 1, 81);
                    assert(fake.component.filters[0] instanceof easeljs.BlurFilter, 82);
                })
                .then(done, done);
        });

        it('should cache when filtering even when caching is not explicit', function (done) {
            const {vm, fake} = buildVm();
            assert(fake.component.cacheCanvas === null);
            wait(fake, 2)
                .then(() => {
                    vm.cache = false;
                    return wait(fake, 2);
                })
                .then(() => {
                    assert(fake.component.cacheCanvas === null, 'still cached');
                    vm.filters = [['BlurFilter', 5, 5, 1]];
                    return wait(fake, 2);
                })
                .then(() => {
                    assert(fake.component.cacheCanvas !== null, 'no cache');
                })
                .then(done, done);
        });

        it('should add and remove filters', function (done) {
            const {vm, fake} = buildVm();
            assert(fake.component.cacheCanvas === null);
            wait(fake, 2)
                .then(() => {
                    vm.cache = false;
                    return wait(fake, 2);
                })
                .then(() => {
                    assert(fake.component.cacheCanvas === null, 'still cached');
                    vm.filters = [['BlurFilter', 5, 5, 1]];
                    return wait(fake, 2);
                })
                .then(() => {
                    assert(fake.component.cacheCanvas !== null, 'no cache');
                    vm.filters = null;
                    return wait(fake, 2);
                })
                .then(() => {
                    assert(fake.component.cacheCanvas === null, 'still cached 2');
                })
                .then(done, done);
        });

        it('should fail on bad filters', function (done) {
            const {vm, fake} = buildVm();
            let caughtError;
            const originalError = console.error;
            console.error = (msg) => caughtError = msg;
            vm.filters = [['NO_SUCH_FILTER', 'whatever param']];
            wait(fake, 2)
                .then(() => {
                    assert(fake.component.cacheCanvas === null, 'cached anyway');
                    assert(!fake.component.filters || fake.component.filters.length === 0);
                    assert(caughtError);
                })
                .finally(() => console.error = originalError)
                .then(done, done);
        });

        [
            ['BlurFilter', 5, 5, 1],
            ['AlphaMapFilter'],
            ['AlphaMaskFilter'],
            ['ColorFilter', 0, 0, 0, 1, 0, 0, 255, 0],
            ['ColorMatricFilter'],
        ].forEach((filter) => {
            it(`should use filter ${filter[0]}`, function (done) {
                const {vm, fake} = buildVm();
                vm.filters = [filter];
                vm.cache = true;
                wait(fake, 2)
                    .then(() => {
                        assert(fake.component.cacheCanvas !== null, 'no cache');
                        assert(fake.component.filters, 80);
                        assert(fake.component.filters.length === 1, 81);
                    })
                    .then(done, done);
            });
        });
    };
};
