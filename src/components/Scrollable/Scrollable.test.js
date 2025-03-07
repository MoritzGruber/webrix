import React from 'react';
import {mount} from 'enzyme';
import {expect} from 'chai';
import sinon from 'sinon';
import Scrollable from './Scrollable';
import {MIN_THUMB_LENGTH, SCROLLING_CLASS_REMOVAL_DELAY} from './Scrollable.constants';
import {getThumbLength, getThumbPosition} from './Scrollable.utils';

const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('<Scrollable/>', () => {

    describe('HTML structure', () => {
        it('should render a Scrollbar', () => {
            const wrapper = mount(<Scrollable/>);
            expect(wrapper.find('.scrollbar')).to.have.length(1);
            expect(wrapper.find('ResizeObserver')).to.have.length(1);
            expect(wrapper.find('VerticalScrollbar')).to.have.length(1);
            expect(wrapper.find('HorizontalScrollbar')).to.have.length(1);
        });
    });

    describe('Life Cycle', () => {
        it('componentDidMount()', () => {
            const s = new Scrollable();
            s.updateScrollbars = sinon.spy();
            s.componentDidMount();
            expect(s.updateScrollbars.calledOnce).to.eql(true);
        });

        it('getSnapshotBeforeUpdate()', () => {
            const s = new Scrollable();
            s.container = {current: {scrollTop: 0, scrollLeft: 0}};
            expect(s.getSnapshotBeforeUpdate()).to.eql(s.container.current);
        });

        it('componentDidUpdate()', () => {
            const s = new Scrollable({scrollOnDOMChange: false});
            s.container = {current: {scrollTop: 0}};
            s.updateScrollbars = sinon.spy();
            s.componentDidUpdate(null, null, {scrollTop: 50, scrollLeft: 50});
            expect(s.container.current.scrollTop).to.eql(50);
            expect(s.container.current.scrollLeft).to.eql(50);
            expect(s.updateScrollbars.callCount).to.eql(1);
        });
    });

    describe('Class Methods', () => {
        it('getEvent()', async () => {
            const container = {clientHeight: 100, clientWidth: 100, scrollHeight: 200, scrollWidth: 200, scrollTop: 50, scrollLeft: 50};
            const s = new Scrollable({});

            s.container = {current: container};
            expect(s.getEvent()).to.eql({top: 0.5, left: 0.5, ...s.container.current});

            s.container.current = {clientHeight: 100, clientWidth: 100, scrollHeight: 200, scrollWidth: 200, scrollTop: 100, scrollLeft: 100};
            expect(s.getEvent()).to.eql({top: 1, left: 1, ...s.container.current});

            s.container.current = {clientHeight: 100, clientWidth: 100, scrollHeight: 200, scrollWidth: 200, scrollTop: 99.5, scrollLeft: 99.5};
            expect(s.getEvent()).to.eql({top: 1, left: 1, ...s.container.current, scrollTop: 100, scrollLeft: 100});

            s.container.current = null;
            expect(s.getEvent()).to.eql({});
        });

        it('handleOnScroll()', async () => {
            const add = sinon.spy(), remove = sinon.spy(), onScroll = sinon.spy();
            const container = {parentElement: {classList: {add, remove}}, clientHeight: 100, clientWidth: 100, scrollHeight: 200, scrollWidth: 200, scrollTop: 50, scrollLeft: 50};
            const s = new Scrollable({onScroll});
            s.container = {current: container};
            s.updateScrollbars = sinon.spy();

            // Should not add class
            s.event.next = s.getEvent();
            s.handleOnScroll({});
            expect(s.updateScrollbars.callCount).to.eql(1);
            expect(add.callCount).to.eql(0);
            expect(remove.callCount).to.eql(0);
            expect(onScroll.callCount).to.eql(1);
            expect(onScroll.calledWith(s.event.next)).to.eql(true);

            // Should add and remove class
            s.handleOnScroll({target: container});
            expect(s.updateScrollbars.callCount).to.eql(2);
            expect(add.callCount).to.eql(1);
            expect(remove.callCount).to.eql(0);
            await waitFor(SCROLLING_CLASS_REMOVAL_DELAY);
            expect(remove.callCount).to.eql(1);
            expect(onScroll.callCount).to.eql(2);
        });

        it('updateScrollbars()', () => {
            const onUpdate = sinon.spy();
            const s = new Scrollable({onUpdate});
            s.vertical = {current: {update: sinon.spy()}};
            s.horizontal = {current: {update: sinon.spy()}};
            s.updateScrollbars();
            expect(s.vertical.current.update.callCount).to.eql(0);
            expect(s.horizontal.current.update.callCount).to.eql(0);
            expect(onUpdate.callCount).to.eql(0);

            s.container.current = {};
            s.updateScrollbars();
            expect(s.vertical.current.update.callCount).to.eql(1);
            expect(s.horizontal.current.update.callCount).to.eql(1);
            expect(onUpdate.callCount).to.eql(1);
        });

        it('ResizeUpdate', () => {
            const s = new Scrollable({onScroll: sinon.spy(), onUpdate: sinon.spy()});
            s.container = {current: {clientHeight: 100, clientWidth: 100, scrollHeight: 200, scrollWidth: 200, scrollTop: 50, scrollLeft: 50}};
            s.vertical = {current: {update: sinon.spy()}};
            s.horizontal = {current: {update: sinon.spy()}};

            s.updateScrollbars();
            expect(s.vertical.current.update.callCount).to.eql(1);
            expect(s.horizontal.current.update.callCount).to.eql(1);

            s.container = {current: {clientHeight: 100, clientWidth: 100, scrollHeight: 500, scrollWidth: 200, scrollTop: 50, scrollLeft: 50}};
            expect(s.vertical.current.update.callCount).to.eql(1);
            expect(s.horizontal.current.update.callCount).to.eql(1);

            s.container = {current: {clientHeight: 100, clientWidth: 100, scrollHeight: 500, scrollWidth: 500, scrollTop: 50, scrollLeft: 50}};
            expect(s.vertical.current.update.callCount).to.eql(1);
            expect(s.horizontal.current.update.callCount).to.eql(1);
        });

        it('onTransitionEnd()', () => {
            const s = new Scrollable();
            s.updateScrollbars = sinon.spy();
            s.handleOnTransitionEnd({propertyName: 'foo'});
            expect(s.updateScrollbars.callCount).to.eql(0);
            s.handleOnTransitionEnd({propertyName: 'height'});
            expect(s.updateScrollbars.callCount).to.eql(1);
            s.handleOnTransitionEnd({propertyName: 'width'});
            expect(s.updateScrollbars.callCount).to.eql(2);
        });
    });

    describe('Utils', () => {
        it('getThumbLength()', () => {
            expect(getThumbLength(100, 100, 100)).to.eql(100);
            expect(getThumbLength(100, 100, 200)).to.eql(50);
            expect(getThumbLength(100, 100, 300)).to.eql(33);
            expect(getThumbLength(200, 100, 300)).to.eql(67);
            expect(getThumbLength(100, 100, 20000)).to.eql(MIN_THUMB_LENGTH);
        });
        it('getThumbPosition()', () => {
            expect(getThumbPosition(100, 100, 200, 0)).to.eql(0);
            expect(getThumbPosition(100, 100, 200, 100)).to.eql(50);
            expect(getThumbPosition(200, 100, 200, 100)).to.eql(100);
        });
    });
});
