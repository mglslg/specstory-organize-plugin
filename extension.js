const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * 复制目录及其内容到目标位置
 * @param {string} source 源路径
 * @param {string} destination 目标路径
 */
function copyDirectory(source, destination) {
  // 确保目标目录存在
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // 读取源目录中的所有内容
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(srcPath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 导出.specstory文件夹内容到指定位置
 */
async function exportSpecStory() {
  // 获取当前工作区
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('没有打开的工作区。');
    return;
  }

  // 获取配置中的目标路径
  let targetBasePath = vscode.workspace.getConfiguration('storyExport').get('targetPath');
  
  // 如果没有配置目标路径，则提示用户选择
  if (!targetBasePath) {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择导出目标文件夹'
    });

    if (!selectedFolder || selectedFolder.length === 0) {
      vscode.window.showInformationMessage('操作已取消。');
      return;
    }

    targetBasePath = selectedFolder[0].fsPath;
    
    // 是否保存路径到配置
    const saveChoice = await vscode.window.showQuickPick(['是', '否'], {
      placeHolder: '是否将此路径保存为默认导出路径？'
    });
    
    if (saveChoice === '是') {
      await vscode.workspace.getConfiguration('storyExport').update('targetPath', targetBasePath, true);
    }
  }

  // 处理每个工作区文件夹
  for (const folder of workspaceFolders) {
    const workspaceName = folder.name;
    const workspacePath = folder.uri.fsPath;
    const specStoryPath = path.join(workspacePath, '.specstory');
    
    // 检查.specstory文件夹是否存在
    if (fs.existsSync(specStoryPath)) {
      // 创建目标路径 (targetBasePath/workspaceName/.specstory)
      const targetPath = path.join(targetBasePath, workspaceName, '.specstory');
      
      try {
        // 执行复制
        copyDirectory(specStoryPath, targetPath);
        vscode.window.showInformationMessage(`已成功导出 ${workspaceName} 的 .specstory 内容到 ${targetPath}`);
      } catch (error) {
        vscode.window.showErrorMessage(`导出失败: ${error.message}`);
      }
    } else {
      vscode.window.showInformationMessage(`${workspaceName} 中未找到 .specstory 文件夹。`);
    }
  }
}

/**
 * 插件激活时调用
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('SpecStory Export 插件已激活');

  // 注册命令
  let disposable = vscode.commands.registerCommand('story-export.exportSpecStory', exportSpecStory);
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}; 