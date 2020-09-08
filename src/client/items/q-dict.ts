/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { commands, Event, EventEmitter, TextDocumentContentChangeEvent, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { QConnManager } from '../modules/q-conn-manager';
import QFunctionTreeItem from './q-function';
import QTableTreeItem from './q-table';
import { setCommand } from './q-utils';
import QVarTreeItem from './q-var';
import path = require('path');

const qTypeMap = new Map<number, string>([
    [0, 'mixed list'],
    [1, 'boolean list'],
    [2, 'guid list'],
    [4, 'byte list'],
    [5, 'short list'],
    [6, 'int list'],
    [7, 'long list'],
    [8, 'real list'],
    [9, 'float list'],
    [10, 'char list'],
    [11, 'symbol list'],
    [12, 'timestamp list'],
    [13, 'month list'],
    [14, 'date list'],
    [15, 'datetime list'],
    [16, 'timespan list'],
    [17, 'minute list'],
    [18, 'second list'],
    [19, 'time list'],
    [77, 'anymap'],
    [78, 'boolean mapped list'],
    [79, 'guid mapped list'],
    [81, 'byte mapped list'],
    [82, 'short mapped list'],
    [83, 'int mapped list'],
    [84, 'long mapped list'],
    [85, 'real mapped list'],
    [86, 'float mapped list'],
    [87, 'char mapped list'],
    [88, 'symbol mapped list'],
    [89, 'timestamp mapped list'],
    [90, 'month mapped list'],
    [91, 'date mapped list'],
    [92, 'datetime mapped list'],
    [93, 'timespan mapped list'],
    [94, 'minute mapped list'],
    [95, 'second mapped list'],
    [96, 'time mapped list'],
    [97, 'nested sym enum'],
    [-1, 'boolean'],
    [-2, 'guid'],
    [-4, 'byte'],
    [-5, 'short'],
    [-6, 'int'],
    [-7, 'long'],
    [-8, 'real'],
    [-9, 'float'],
    [-10, 'char'],
    [-11, 'symbol'],
    [-12, 'timestamp'],
    [-13, 'month'],
    [-14, 'date'],
    [-15, 'datetime'],
    [-16, 'timespan'],
    [-17, 'minute'],
    [-18, 'second'],
    [-19, 'time'],
]);

export default class QDictTreeItem extends TreeItem
    implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: EventEmitter<QDictTreeItem | undefined> = new EventEmitter<QDictTreeItem | undefined>();
    private _onDidChangeTextDocument: EventEmitter<TextDocumentContentChangeEvent> = new EventEmitter<TextDocumentContentChangeEvent>();
    readonly onDidChangeTreeData: Event<QDictTreeItem | undefined> = this._onDidChangeTreeData.event;
    readonly onDidChangeTextDocument: Event<TextDocumentContentChangeEvent> = this._onDidChangeTextDocument.event;
    contextValue = 'qdict';
    _parent: TreeItem | null;
    _children: TreeItem[] = [];
    isExpanded: boolean;
    constructor(namespace: string, parent: TreeItem | null) {
        super(namespace, TreeItemCollapsibleState.Collapsed);
        this._parent = parent;
        if (parent instanceof QDictTreeItem) {
            parent.appendChild(this);
        }
        this.isExpanded = false;
        setCommand(this);
    }

    get iconPath(): { light: string, dark: string } {
        return {
            light: path.join(__filename, '../../assets/svg/item/dict.svg'),
            dark: path.join(__filename, '../../assets/svg/item/dict.svg')
        };
    }

    refresh(): void {
        if (this._parent) {
            return;
        }
        const conn = QConnManager.current?.activeConn?.conn;
        const query = `{
            r: flip \`n\`p!"SS"$\\:();
            f: {sv[\`]each x,'y};
            n: f[\`] (key \`)except\`q\`Q\`h\`j\`o;
            v: key \`.;
            r: r upsert (v,'\`.);
            r: r upsert (n,'\`root);
            r: r upsert (,/) {if[11h=type n:key x;r:(y[x] n), 'x];if[count r;r,:(,/).z.s[;y]each r[;0]];:r}[;f] each n;
            r: update t:{@[{type value x};x;-255h]} each n from r;
            r: select from r where not t in 101 -255h;
            r: update b: {string value x} each n from r where t within 100 111h;
            r: update t: {$[.Q.qt value x;98h;99h]} each n from r where t in 98 99h;
            r: update c: cols each n from r where t=98h;
            r
         }[]`;
        if (conn) {
            conn.k(query, (err, res) => {
                if (err) {
                    window.showErrorMessage(`Unable to fetch variables from ${QConnManager.current?.activeConn?.label}`);
                }
                if (res) {
                    // name, type, body, parent, cols
                    this._children = [];
                    const itemMap = new Map<string, TreeItem>();
                    itemMap.set('root', this);
                    itemMap.set('.', new QDictTreeItem('.', this));
                    const code: string[] = [];
                    res.n.forEach((name: string, i: number) => {
                        const parent = itemMap.get(res.p[i]) as QDictTreeItem;
                        const type = res.t[i];
                        switch (true) {
                            case (type == 112):
                                new QFunctionTreeItem(name, parent, '{"dynamic load"}');
                                code.push(`${res.n[i]}:{"dynamic load"};`);
                                break;
                            case (type >= 100):
                                new QFunctionTreeItem(name, parent, res.b[i]);
                                code.push(`${res.n[i]}:${res.b[i]};`);
                                break;
                            case (type == 99):
                                itemMap.set(name, new QDictTreeItem(name, parent));
                                code.push(`${res.n[i]}:!;`);
                                break;
                            case (type == 98):
                                new QTableTreeItem(name, parent, res.c[i]);
                                code.push(`${res.n[i]}:([]${res.c[i].join(';')});`);
                                res.c[i].forEach((col: string) => code.push(`${col}:\`${col};`));
                                break;
                            case (type >= 20 && type <= 76):
                                new QVarTreeItem(name, parent, 'enums');
                                code.push(`${res.n[i]}:enums;`);
                                break;
                            default:
                                new QVarTreeItem(name, parent, qTypeMap.get(res.t[i]) ?? `unknown:${res.t[i]}`);
                                code.push(`${res.n[i]}:${qTypeMap.get(res.t[i])};`);
                        }
                    });
                    this._onDidChangeTreeData.fire(undefined);
                    commands.executeCommand('q-servers.sendServerCache', code.join('\n'));
                }
            });
        }
    }

    getChildren(e?: TreeItem): Thenable<TreeItem[]> {
        if (e instanceof QDictTreeItem) {
            return Promise.resolve(e._children);
        } else if (e) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this._children);
        }
    }

    getParent(): TreeItem | null {
        return this._parent;
    }

    getTreeItem(e: QDictTreeItem): TreeItem {
        return e;
    }

    onDidCollapse(): void {
        this.isExpanded = false;
    }

    onDidExpand(): void {
        this.isExpanded = true;
    }

    appendChild(item: TreeItem): void {
        this._children.push(item);
    }
}