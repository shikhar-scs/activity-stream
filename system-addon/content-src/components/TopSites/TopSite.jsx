import {actionCreators as ac, actionTypes as at} from "common/Actions.jsm";
import {
  MIN_CORNER_FAVICON_SIZE,
  MIN_RICH_FAVICON_SIZE,
  TOP_SITES_CONTEXT_MENU_OPTIONS,
  TOP_SITES_SOURCE
} from "./TopSitesConstants";
import {injectIntl} from "react-intl";
import {LinkMenu} from "content-src/components/LinkMenu/LinkMenu";
import React from "react";

export class TopSiteLink extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onDragEvent = this.onDragEvent.bind(this);
  }

  /*
   * Helper to determine whether the drop zone should allow a drop. We only allow
   * dropping top sites for now.
   */
  _allowDrop(e) {
    return e.dataTransfer.types.includes("text/topsite-index");
  }

  onDragEvent(event) {
    switch (event.type) {
      case "click":
        // Stop any link clicks if we started any dragging
        if (this.dragged) {
          event.preventDefault();
        }
        break;
      case "dragstart":
        this.dragged = true;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/topsite-index", this.props.index);
        event.target.blur();
        this.props.onDragEvent(event, this.props.index, this.props.link, this.props.title);
        break;
      case "dragend":
        this.props.onDragEvent(event);
        break;
      case "dragenter":
      case "dragover":
      case "drop":
        if (this._allowDrop(event)) {
          event.preventDefault();
          this.props.onDragEvent(event, this.props.index);
        }
        break;
      case "mousedown":
        // Reset at the first mouse event of a potential drag
        this.dragged = false;
        break;
    }
  }
  render() {
    const {children, className, isDraggable, link, onClick, title} = this.props;
    const topSiteOuterClassName = `top-site-outer${className ? ` ${className}` : ""}`;
    const {tippyTopIcon, faviconSize} = link;
    const letterFallback = title[0];
    let imageClassName;
    let imageStyle;
    let showSmallFavicon = false;
    let smallFaviconStyle;
    let smallFaviconFallback;
    if (tippyTopIcon || faviconSize >= MIN_RICH_FAVICON_SIZE) {
      // styles and class names for top sites with rich icons
      imageClassName = "top-site-icon rich-icon";
      imageStyle = {
        backgroundColor: link.backgroundColor,
        backgroundImage: `url(${tippyTopIcon || link.favicon})`
      };
    } else {
      // styles and class names for top sites with screenshot + small icon in top left corner
      imageClassName = `screenshot${link.screenshot ? " active" : ""}`;
      imageStyle = {backgroundImage: link.screenshot ? `url(${link.screenshot})` : "none"};

      // only show a favicon in top left if it's greater than 16x16
      if (faviconSize >= MIN_CORNER_FAVICON_SIZE) {
        showSmallFavicon = true;
        smallFaviconStyle = {backgroundImage:  `url(${link.favicon})`};
      } else if (link.screenshot) {
        // Don't show a small favicon if there is no screenshot, because that
        // would result in two fallback icons
        showSmallFavicon = true;
        smallFaviconFallback = true;
      }
    }
    let draggableProps = {};
    if (isDraggable) {
      draggableProps = {
        onClick: this.onDragEvent,
        onDragEnd: this.onDragEvent,
        onDragStart: this.onDragEvent,
        onMouseDown: this.onDragEvent
      };
    }
    return (<li className={topSiteOuterClassName} onDrop={this.onDragEvent} onDragOver={this.onDragEvent} onDragEnter={this.onDragEvent} onDragLeave={this.onDragEvent} {...draggableProps}>
      <div className="top-site-inner">
         <a href={link.url} onClick={onClick}>
            <div className="tile" aria-hidden={true} data-fallback={letterFallback}>
              <div className={imageClassName} style={imageStyle} />
              {showSmallFavicon && <div
                className="top-site-icon default-icon"
                data-fallback={smallFaviconFallback && letterFallback}
                style={smallFaviconStyle} />}
           </div>
           <div className={`title ${link.isPinned ? "pinned" : ""}`}>
             {link.isPinned && <div className="icon icon-pin-small" />}
              <span dir="auto">{title}</span>
           </div>
         </a>
         {children}
      </div>
    </li>);
  }
}
TopSiteLink.defaultProps = {
  title: "",
  link: {},
  isDraggable: true
};

export class TopSite extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {showContextMenu: false};
    this.onLinkClick = this.onLinkClick.bind(this);
    this.onMenuButtonClick = this.onMenuButtonClick.bind(this);
    this.onMenuUpdate = this.onMenuUpdate.bind(this);
    this.onDismissButtonClick = this.onDismissButtonClick.bind(this);
    this.onPinButtonClick = this.onPinButtonClick.bind(this);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
  }
  userEvent(event) {
    this.props.dispatch(ac.UserEvent({
      event,
      source: TOP_SITES_SOURCE,
      action_position: this.props.index
    }));
  }
  onLinkClick(ev) {
    if (this.props.onEdit) {
      // Ignore clicks if we are in the edit modal.
      ev.preventDefault();
      return;
    }
    this.userEvent("CLICK");
  }
  onMenuButtonClick(event) {
    event.preventDefault();
    this.props.onActivate(this.props.index);
    this.setState({showContextMenu: true});
  }
  onMenuUpdate(showContextMenu) {
    this.setState({showContextMenu});
  }
  onDismissButtonClick() {
    const {link} = this.props;
    if (link.isPinned) {
      this.props.dispatch(ac.SendToMain({
        type: at.TOP_SITES_UNPIN,
        data: {site: {url: link.url}}
      }));
    }
    this.props.dispatch(ac.SendToMain({
      type: at.BLOCK_URL,
      data: link.url
    }));
    this.userEvent("BLOCK");
  }
  onPinButtonClick() {
    const {link, index} = this.props;
    if (link.isPinned) {
      this.props.dispatch(ac.SendToMain({
        type: at.TOP_SITES_UNPIN,
        data: {site: {url: link.url}}
      }));
      this.userEvent("UNPIN");
    } else {
      this.props.dispatch(ac.SendToMain({
        type: at.TOP_SITES_PIN,
        data: {site: {url: link.url}, index}
      }));
      this.userEvent("PIN");
    }
  }
  onEditButtonClick() {
    this.props.onEdit(this.props.index);
  }
  render() {
    const {props} = this;
    const {link} = props;
    const isContextMenuOpen = this.state.showContextMenu && props.activeIndex === props.index;
    const title = link.label || link.hostname;
    return (<TopSiteLink {...props} onClick={this.onLinkClick} onDragEvent={this.props.onDragEvent} className={isContextMenuOpen ? "active" : ""} title={title}>
        {!props.onEdit &&
          <div>
            <button className="context-menu-button icon" onClick={this.onMenuButtonClick}>
              <span className="sr-only">{`Open context menu for ${title}`}</span>
            </button>
            <LinkMenu
              dispatch={props.dispatch}
              index={props.index}
              onUpdate={this.onMenuUpdate}
              options={TOP_SITES_CONTEXT_MENU_OPTIONS}
              site={link}
              source={TOP_SITES_SOURCE}
              visible={isContextMenuOpen} />
          </div>
        }
        {props.onEdit &&
          <div className="edit-menu">
            <button
              className={`icon icon-${link.isPinned ? "unpin" : "pin"}`}
              title={this.props.intl.formatMessage({id: `edit_topsites_${link.isPinned ? "unpin" : "pin"}_button`})}
              onClick={this.onPinButtonClick} />
            <button
              className="icon icon-edit"
              title={this.props.intl.formatMessage({id: "edit_topsites_edit_button"})}
              onClick={this.onEditButtonClick} />
            <button
              className="icon icon-dismiss"
              title={this.props.intl.formatMessage({id: "edit_topsites_dismiss_button"})}
              onClick={this.onDismissButtonClick} />
          </div>
        }
    </TopSiteLink>);
  }
}
TopSite.defaultProps = {
  link: {},
  onActivate() {}
};

export class TopSitePlaceholder extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
  }

  onEditButtonClick() {
    if (this.props.onEdit) {
      this.props.onEdit(this.props.index);
      return;
    }

    this.props.dispatch(
      {type: at.TOP_SITES_EDIT, data: {index: this.props.index}});
  }

  render() {
    return (<TopSiteLink className="placeholder" isDraggable={false} {...this.props}>
      <button className="context-menu-button edit-button icon"
       title={this.props.intl.formatMessage({id: "edit_topsites_edit_button"})}
       onClick={this.onEditButtonClick} />
    </TopSiteLink>);
  }
}

export class _TopSiteList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = this.DEFAULT_STATE = {
      draggedIndex: null,
      draggedSite: null,
      draggedTitle: null,
      topSitesPreview: null,
      activeIndex: null
    };
    this.onDragEvent = this.onDragEvent.bind(this);
    this.onActivate = this.onActivate.bind(this);
  }
  componentWillUpdate(nextProps) {
    if (this.state.draggedSite) {
      const prevTopSites = this.props.TopSites && this.props.TopSites.rows;
      const newTopSites = nextProps.TopSites && nextProps.TopSites.rows;
      if (prevTopSites && prevTopSites[this.state.draggedIndex] &&
        prevTopSites[this.state.draggedIndex].url === this.state.draggedSite.url &&
        (!newTopSites[this.state.draggedIndex] || newTopSites[this.state.draggedIndex].url !== this.state.draggedSite.url)) {
        // We got the new order from the redux store via props. We can clear state now.
        this.setState(this.DEFAULT_STATE);
      }
    }
  }
  userEvent(event, index) {
    this.props.dispatch(ac.UserEvent({
      event,
      source: TOP_SITES_SOURCE,
      action_position: index
    }));
  }
  onDragEvent(event, index, link, title) {
    switch (event.type) {
      case "dragstart":
        this.dropped = false;
        this.setState({
          draggedIndex: index,
          draggedSite: link,
          draggedTitle: title,
          activeIndex: null
        });
        this.userEvent("DRAG", index);
        break;
      case "dragend":
        if (!this.dropped) {
          // If there was no drop event, reset the state to the default.
          this.setState(this.DEFAULT_STATE);
        }
        break;
      case "dragenter":
        if (index === this.state.draggedIndex) {
          this.setState({topSitesPreview: null});
        } else {
          this.setState({topSitesPreview: this._makeTopSitesPreview(index)});
        }
        break;
      case "drop":
        if (index !== this.state.draggedIndex) {
          this.dropped = true;
          this.props.dispatch(ac.SendToMain({
            type: at.TOP_SITES_INSERT,
            data: {site: {url: this.state.draggedSite.url, label: this.state.draggedTitle}, index, draggedFromIndex: this.state.draggedIndex}
          }));
          this.userEvent("DROP", index);
        }
        break;
    }
  }
  _getTopSites() {
    // Make a copy of the sites to truncate or extend to desired length
    let topSites = this.props.TopSites.rows.slice();
    topSites.length = this.props.TopSitesCount;
    return topSites;
  }

  /**
   * Make a preview of the topsites that will be the result of dropping the currently
   * dragged site at the specified index.
   */
  _makeTopSitesPreview(index) {
    const topSites = this._getTopSites();
    topSites[this.state.draggedIndex] = null;
    const pinnedOnly = topSites.map(site => ((site && site.isPinned) ? site : null));
    const unpinned = topSites.filter(site => site && !site.isPinned);
    const siteToInsert = Object.assign({}, this.state.draggedSite, {isPinned: true});
    if (!pinnedOnly[index]) {
      pinnedOnly[index] = siteToInsert;
    } else {
      // Find the hole to shift the pinned site(s) towards. We shift towards the
      // hole left by the site being dragged.
      let holeIndex = index;
      const indexStep = index > this.state.draggedIndex ? -1 : 1;
      while (pinnedOnly[holeIndex]) {
        holeIndex += indexStep;
      }

      // Shift towards the hole.
      const shiftingStep = index > this.state.draggedIndex ? 1 : -1;
      while (holeIndex !== index) {
        const nextIndex = holeIndex + shiftingStep;
        pinnedOnly[holeIndex] = pinnedOnly[nextIndex];
        holeIndex = nextIndex;
      }
      pinnedOnly[index] = siteToInsert;
    }

    // Fill in the remaining holes with unpinned sites.
    const preview = pinnedOnly;
    for (let i = 0; i < preview.length; i++) {
      if (!preview[i]) {
        preview[i] = unpinned.shift() || null;
      }
    }

    return preview;
  }
  onActivate(index) {
    this.setState({activeIndex: index});
  }
  render() {
    const {props} = this;
    const topSites = this.state.topSitesPreview || this._getTopSites();
    const topSitesUI = [];
    const commonProps = {
      onDragEvent: this.onDragEvent,
      dispatch: props.dispatch,
      intl: props.intl
    };
    // We assign a key to each placeholder slot. We need it to be independent
    // of the slot index (i below) so that the keys used stay the same during
    // drag and drop reordering and the underlying DOM nodes are reused.
    // This mostly (only?) affects linux so be sure to test on linux before changing.
    let holeIndex = 0;
    for (let i = 0, l = topSites.length; i < l; i++) {
      const link = topSites[i];
      const slotProps = {
        key: link ? link.url : holeIndex++,
        index: i
      };
      topSitesUI.push(!link ? (
        <TopSitePlaceholder
          onEdit={props.onEdit}
          {...slotProps}
          {...commonProps} />
      ) : (
        <TopSite
          link={link}
          onEdit={props.onEdit}
          activeIndex={this.state.activeIndex}
          onActivate={this.onActivate}
          {...slotProps}
          {...commonProps} />
      ));
    }
    return (<ul className={`top-sites-list${this.state.draggedSite ? " dnd-active" : ""}`}>
      {topSitesUI}
    </ul>);
  }
}

export const TopSiteList = injectIntl(_TopSiteList);
