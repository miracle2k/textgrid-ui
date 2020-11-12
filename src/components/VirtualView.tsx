import PropTypes from 'prop-types';
import * as React from 'react';
//import createCallbackMemoizer from '../utils/createCallbackMemoizer';
import getScrollbarSize from 'dom-helpers/scrollbarSize';

/**
 * Specifies the number of milliseconds during which to disable pointer events while a scroll is in progress.
 * This improves performance and makes scrolling smoother.
 */
const IS_SCROLLING_TIMEOUT = 150;

/**
 * Controls whether the Grid updates the DOM element's scrollLeft/scrollTop based on the current state or just observes it.
 * This prevents Grid from interrupting mouse-wheel animations (see issue #2).
 */
const SCROLL_POSITION_CHANGE_REASONS = {
  OBSERVED: 'observed',
  REQUESTED: 'requested',
};


export type LayoutManager = {
  getScrollPositionForCell: any,
  cellRenderers: (opts: {isScrolling: boolean, width: number, x: number}) => any
};

export interface Props extends React.BaseHTMLAttributes<HTMLDivElement> {
  /**
   * The actual width of the internal content.
   */
  virtualWidth: number,

  /**
   * Removes fixed height from the scrollingContainer so that the total height
   * of rows can stretch the window. Intended for use with WindowScroller
   */
  autoHeight?: boolean,

  /**
   * Calculates cell sizes and positions and manages rendering the appropriate cells given a specified window.
   */
  layoutManager: LayoutManager,

  innerRef?: any,

  /**
   * Optional custom CSS class name to attach to root Collection element.
   */
  className?: string,

  /**
   * Height of Collection; this property determines the number of visible (vs virtualized) rows.
   */
  height?: number,

  /**
   * Optional custom id to attach to root Collection element.
   */
  id?: string,

  /**
   * Enables the `Collection` to horiontally "overscan" its content similar to how `Grid` does.
   * This can reduce flicker around the edges when a user scrolls quickly.
   */
  horizontalOverscanSize: number,

  isScrollingChange?: (val: boolean) => void,

  /**
   * Callback invoked whenever the scroll offset changes within the inner scrollable region.
   * This callback can be used to sync scrolling between lists, tables, or grids.
   * ({ clientHeight, clientWidth, scrollHeight, scrollLeft, scrollTop, scrollWidth }): void
   */
  onScroll?: () => void,

  /**
   * Horizontal offset.
   */
  scrollLeft?: number,

  /**
   * Controls scroll-to-cell behavior of the Grid.
   * The default ("auto") scrolls the least amount possible to ensure that the specified cell is fully visible.
   * Use "start" to align cells to the top/left of the Grid and "end" to align bottom/right.
   */
  scrollToAlignment: 'auto'|'end'|'start'|'center',

  /**
   * Cell index to ensure visible (by forcefully scrolling if necessary).
   */
  scrollToCell?: number,

  /**
   * Optional custom inline style to attach to root Collection element.
   */
  style?: object,

  /**
   * Width of Collection; this will essentially be passed back to you (with overscan adjustments), determining
   * the window that should be rendered. You have to give this to the component, as otherwise it would have
   * to do DOM measuring to figure out it's own size. We leave this up to you - providing a static with -  or
   * any third party component you may want to use.
   */
  width: number,
}

/**
 * This is extracted from the react-virtualized `CollectionView`, and is a generic container with callbacks
 * for you to render whatever goes into the correct window.
 *
 * I regret ripping out the virtual-height functionality, as well as the event callbacks, but it was a good
 * learning experience to understand the system.
 */
export class VirtualView extends React.PureComponent<Props> {

  static defaultProps = {
    horizontalOverscanSize: 0,
    scrollToAlignment: 'auto',
    scrollToCell: -1,
    style: {},
  };

  state = {
    isScrolling: false,
    scrollLeft: 0,
    scrollPositionChangeReason: null
  };

  _calculateSizeAndPositionDataOnNextUpdate = false;

  _scrollbarSize: number;
  _scrollbarSizeMeasured: boolean;

  constructor(...args: any[]) {
    // @ts-ignore
    super(...args);

    // If this component is being rendered server-side, getScrollbarSize() will return undefined.
    // We handle this case in componentDidMount()
    this._scrollbarSize = getScrollbarSize();
    if (this._scrollbarSize === undefined) {
      this._scrollbarSizeMeasured = false;
      this._scrollbarSize = 0;
    } else {
      this._scrollbarSizeMeasured = true;
    }
  }
  /* ---------------------------- Component lifecycle methods ---------------------------- */

  /**
   * @private
   * This method updates scrollLeft/scrollTop in state for the following conditions:
   * 1) Empty content (0 rows or columns)
   * 2) New scroll props overriding the current state
   * 3) Cells-count or cells-size has changed, making previous scroll offsets invalid
   */
  static getDerivedStateFromProps(nextProps: Props, prevState: any) {
    // We could bring this back as a "noItems" property just for this reset.
    // if (
    //     nextProps.cellCount === 0 &&
    //     (prevState.scrollLeft !== 0)
    // ) {
    //   return {
    //     scrollLeft: 0,
    //     scrollPositionChangeReason: SCROLL_POSITION_CHANGE_REASONS.REQUESTED,
    //   };
    // } else
    if (
        nextProps.scrollLeft !== prevState.scrollLeft
    ) {
      return {
        scrollLeft:
            nextProps.scrollLeft != null
                ? nextProps.scrollLeft
                : prevState.scrollLeft,
        scrollPositionChangeReason: SCROLL_POSITION_CHANGE_REASONS.REQUESTED,
      };
    }

    return null;
  }

  componentDidMount() {
    const {scrollLeft, scrollToCell} = this.props;

    // If this component was first rendered server-side, scrollbar size will be undefined.
    // In that event we need to remeasure.
    if (!this._scrollbarSizeMeasured) {
      this._scrollbarSize = getScrollbarSize();
      this._scrollbarSizeMeasured = true;
      this.setState({});
    }

    if (scrollToCell !== undefined && scrollToCell >= 0) {
      this._updateScrollPositionForScrollToCell();
    } else if (scrollLeft && scrollLeft >= 0) {
      this._setScrollPosition({scrollLeft});
    }
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    const {height, scrollToAlignment, scrollToCell, width} = this.props;
    const {scrollLeft, scrollPositionChangeReason} = this.state;

    // Make sure requested changes to :scrollLeft or :scrollTop get applied.
    // Assigning to scrollLeft/scrollTop tells the browser to interrupt any running scroll animations,
    // And to discard any pending async changes to the scroll position that may have happened in the meantime (e.g. on a separate scrolling thread).
    // So we only set these when we require an adjustment of the scroll position.
    // See issue #2 for more information.
    if (
        scrollPositionChangeReason === SCROLL_POSITION_CHANGE_REASONS.REQUESTED
    ) {
      if (
          scrollLeft >= 0 &&
          scrollLeft !== prevState.scrollLeft &&
          scrollLeft !== this._scrollingContainer.scrollLeft
      ) {
        this._scrollingContainer.scrollLeft = scrollLeft;
      }
    }

    // Update scroll offsets if the current :scrollToCell values requires it
    if (
        height !== prevProps.height ||
        scrollToAlignment !== prevProps.scrollToAlignment ||
        scrollToCell !== prevProps.scrollToCell ||
        width !== prevProps.width
    ) {
      this._updateScrollPositionForScrollToCell();
    }
  }

  _disablePointerEventsTimeoutId: any;
  componentWillUnmount() {
    if (this._disablePointerEventsTimeoutId) {
      clearTimeout(this._disablePointerEventsTimeoutId);
    }
  }

  render() {
    const {
      autoHeight,
      layoutManager,
      className,
      height,
      horizontalOverscanSize,
      id,
      style,
      width,
      virtualWidth,
      scrollToAlignment,
      scrollToCell,
      innerRef,
      ...rest
    } = this.props;

    const {isScrolling, scrollLeft} = this.state;

    const totalWidth = virtualWidth;

    // Safely expand the rendered area by the specified overscan amount
    const left = Math.max(0, scrollLeft - horizontalOverscanSize);
    const right = Math.min(
        totalWidth,
        scrollLeft + width + horizontalOverscanSize,
    );

    const childrenToDisplay =
        width > 0
            ? layoutManager.cellRenderers({
              isScrolling,
              width: right - left,
              x: left,
            })
            : [];

    const collectionStyle: any = {
      boxSizing: 'border-box',
      direction: 'ltr',
      height: autoHeight ? 'auto' : height,
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
      width,
      willChange: 'transform',
    };

    // Force browser to hide scrollbars when we know they aren't necessary.
    // Otherwise once scrollbars appear they may not disappear again.
    // For more info see issue #116
    // const verticalScrollBarSize =
    //     totalHeight > height ? this._scrollbarSize : 0;
    // const horizontalScrollBarSize =
    //     totalWidth > width ? this._scrollbarSize : 0;

    // Also explicitly init styles to 'auto' if scrollbars are required.
    // This works around an obscure edge case where external CSS styles have not yet been loaded,
    // But an initial scroll index of offset is set as an external prop.
    // Without this style, Grid would render the correct range of cells but would NOT update its internal offset.
    // This was originally reported via clauderic/react-infinite-calendar/issues/23
    // collectionStyle.overflowX =
    //     totalWidth + verticalScrollBarSize <= width ? 'hidden' : 'auto';
    // collectionStyle.overflowY =
    //     totalHeight + horizontalScrollBarSize <= height ? 'hidden' : 'auto';
    collectionStyle.overflowX = 'auto';

    return (
        <div
          ref={this._setScrollingContainerRef}
          aria-label={this.props['aria-label']}
          className={className}
          id={id}
          onScroll={this._onScroll}
          role="grid"
          style={{
            ...collectionStyle,
            ...style,
          }}
          tabIndex={0}
          {...rest}
        >
          <div
              style={{
                // height: totalHeight,
                // maxHeight: totalHeight,
                maxWidth: totalWidth,
                overflow: 'hidden',
                pointerEvents: isScrolling ? 'none' as any : '',
                width: totalWidth,
                height: '100%'
              }}>
            {childrenToDisplay}
          </div>
        </div>
    );
  }

  /* ---------------------------- Helper methods ---------------------------- */

  /**
   * Sets an :isScrolling flag for a small window of time.
   * This flag is used to disable pointer events on the scrollable portion of the Collection.
   * This prevents jerky/stuttery mouse-wheel scrolling.
   */
  _enablePointerEventsAfterDelay() {
    if (this._disablePointerEventsTimeoutId) {
      clearTimeout(this._disablePointerEventsTimeoutId);
    }

    this._disablePointerEventsTimeoutId = setTimeout(() => {
      const {isScrollingChange} = this.props;

      isScrollingChange?.(false);

      this._disablePointerEventsTimeoutId = null;
      this.setState({
        isScrolling: false,
      });
    }, IS_SCROLLING_TIMEOUT);
  }

  _scrollingContainer: any;
  _setScrollingContainerRef = (ref: any) => {
    this._scrollingContainer = ref;
    this.props.innerRef.current = ref;
  };

  _setScrollPosition({scrollLeft}: {scrollLeft: number}) {
    const newState: any = {
      scrollPositionChangeReason: SCROLL_POSITION_CHANGE_REASONS.REQUESTED,
    };

    if (scrollLeft >= 0) {
      newState.scrollLeft = scrollLeft;
    }

    if (
        (scrollLeft >= 0 && scrollLeft !== this.state.scrollLeft)
    ) {
      this.setState(newState);
    }
  }

  _updateScrollPositionForScrollToCell = () => {
    const {
      layoutManager,
      height,
      scrollToAlignment,
      scrollToCell,
      width,
    } = this.props;
    const {scrollLeft} = this.state;

    if (scrollToCell !== undefined && scrollToCell >= 0) {
      const scrollPosition = layoutManager.getScrollPositionForCell({
        align: scrollToAlignment,
        cellIndex: scrollToCell,
        height,
        scrollLeft,
        width,
      });

      if (
          scrollPosition.scrollLeft !== scrollLeft
      ) {
        this._setScrollPosition(scrollPosition);
      }
    }
  };

  _onScroll = (event: any) => {
    // In certain edge-cases React dispatches an onScroll event with an invalid target.scrollLeft / target.scrollTop.
    // This invalid event can be detected by comparing event.target to this component's scrollable DOM element.
    // See issue #404 for more information.
    if (event.target !== this._scrollingContainer) {
      return;
    }

    // Prevent pointer events from interrupting a smooth scroll
    this._enablePointerEventsAfterDelay();

    // When this component is shrunk drastically, React dispatches a series of back-to-back scroll events,
    // Gradually converging on a scrollTop that is within the bounds of the new, smaller height.
    // This causes a series of rapid renders that is slow for long lists.
    // We can avoid that by doing some simple bounds checking to ensure that scrollTop never exceeds the total height.
    const {isScrollingChange, width} = this.props;
    const scrollbarSize = this._scrollbarSize;
    const totalWidth = this.props.virtualWidth;
    const scrollLeft = Math.max(
        0,
        Math.min(totalWidth - width + scrollbarSize, event.target.scrollLeft),
    );

    // Certain devices (like Apple touchpad) rapid-fire duplicate events.
    // Don't force a re-render if this is the case.
    // The mouse may move faster then the animation frame does.
    // Use requestAnimationFrame to avoid over-updating.
    if (
        this.state.scrollLeft !== scrollLeft
    ) {
      // Browsers with cancelable scroll events (eg. Firefox) interrupt scrolling animations if scrollTop/scrollLeft is set.
      // Other browsers (eg. Safari) don't scroll as well without the help under certain conditions (DOM or style changes during scrolling).
      // All things considered, this seems to be the best current work around that I'm aware of.
      // For more information see https://github.com/bvaughn/react-virtualized/pull/124
      const scrollPositionChangeReason = event.cancelable
          ? SCROLL_POSITION_CHANGE_REASONS.OBSERVED
          : SCROLL_POSITION_CHANGE_REASONS.REQUESTED;

      // Synchronously set :isScrolling the first time (since _setNextState will reschedule its animation frame each time it's called)
      if (!this.state.isScrolling) {
        isScrollingChange?.(true);
      }

      this.setState({
        isScrolling: true,
        scrollLeft,
        scrollPositionChangeReason,
      });
    }
  };
}
